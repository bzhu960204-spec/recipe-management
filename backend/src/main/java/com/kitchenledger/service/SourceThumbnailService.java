package com.kitchenledger.service;

import com.kitchenledger.config.AppProperties;
import com.kitchenledger.web.error.BadRequestException;
import org.springframework.stereotype.Service;

import java.io.IOException;
import java.net.InetSocketAddress;
import java.net.ProxySelector;
import java.net.URI;
import java.net.URISyntaxException;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.time.Duration;
import java.util.List;
import java.util.Locale;
import java.util.Optional;
import java.util.regex.Pattern;

/**
 * Derives a cover image from a recipe's source link. Only YouTube is supported today: the thumbnail
 * URL is built from a strictly validated 11-character video id and fetched from a fixed host, so a
 * malicious source URL cannot turn this into a server-side request forgery. Outbound traffic can be
 * routed through an admin-configured HTTP proxy (stored in app_settings) for networks that block
 * YouTube directly; the proxy is read per request so a Settings change applies without a restart.
 */
@Service
public class SourceThumbnailService {

    /** app_settings key holding the outbound proxy as "host:port"; blank/absent means a direct connection. */
    public static final String PROXY_SETTING_KEY = "thumbnail.proxy";

    /** A stable, long-lived video (YouTube's first upload) used only to probe connectivity. */
    private static final String PROBE_VIDEO_ID = "jNQXAC9IVRw";

    private static final Pattern VIDEO_ID = Pattern.compile("[A-Za-z0-9_-]{11}");

    /** Highest to lowest quality; maxres/sd are often missing, hqdefault effectively always exists. */
    private static final List<String> QUALITIES = List.of("maxresdefault", "sddefault", "hqdefault");

    private final AppSettingService appSettings;
    private final long maxBytes;

    public SourceThumbnailService(AppProperties properties, AppSettingService appSettings) {
        this.appSettings = appSettings;
        this.maxBytes = properties.storage().maxImageBytes();
    }

    /** Fetches the best available YouTube thumbnail for the given source URL. */
    public byte[] fetchYouTubeThumbnail(String sourceUrl) {
        String videoId = youTubeVideoId(sourceUrl)
                .orElseThrow(() -> new BadRequestException("Source link is not a recognised YouTube URL"));

        HttpClient http = buildClient(currentProxy().orElse(null));
        boolean connectionFailed = false;
        for (String quality : QUALITIES) {
            Fetch fetch = download(http, thumbnailUrl(videoId, quality));
            if (fetch.image != null) {
                return fetch.image;
            }
            connectionFailed |= fetch.connectionError;
        }
        if (connectionFailed) {
            throw new BadRequestException(currentProxy().isPresent()
                    ? "Could not reach YouTube through the proxy. Check the proxy IP/port in Settings and that the proxy can access the internet."
                    : "The server could not reach YouTube directly. Configure a proxy under Settings \u2192 Server proxy.");
        }
        throw new BadRequestException("No thumbnail is available for this video");
    }

    /** Probes connectivity to YouTube, optionally through a candidate proxy that has not been saved yet. */
    public TestResult testProxy(String host, Integer port) {
        InetSocketAddress proxy;
        if (host != null && !host.isBlank()) {
            if (port == null) {
                return new TestResult(false, "Enter a port for the proxy.");
            }
            proxy = new InetSocketAddress(host.trim(), port);
        } else {
            proxy = currentProxy().orElse(null);
        }

        Fetch fetch = download(buildClient(proxy), thumbnailUrl(PROBE_VIDEO_ID, "hqdefault"));
        if (fetch.image != null) {
            return new TestResult(true, proxy == null ? "Connected to YouTube directly." : "Proxy works \u2014 reached YouTube.");
        }
        if (fetch.connectionError) {
            return new TestResult(false, proxy == null
                    ? "Could not reach YouTube directly. Enter a proxy IP and port."
                    : "Could not reach YouTube through the proxy. Check the IP/port and that the proxy is running.");
        }
        return new TestResult(false, "Connected, but YouTube returned an unexpected response.");
    }

    private String thumbnailUrl(String videoId, String quality) {
        return "https://i.ytimg.com/vi/" + videoId + "/" + quality + ".jpg";
    }

    private Optional<InetSocketAddress> currentProxy() {
        return appSettings.get(PROXY_SETTING_KEY).flatMap(SourceThumbnailService::parseProxy);
    }

    private HttpClient buildClient(InetSocketAddress proxy) {
        HttpClient.Builder builder = HttpClient.newBuilder()
                .connectTimeout(Duration.ofSeconds(5))
                .followRedirects(HttpClient.Redirect.NEVER);
        if (proxy != null) {
            builder.proxy(ProxySelector.of(proxy));
        }
        return builder.build();
    }

    private Fetch download(HttpClient http, String url) {
        HttpRequest request = HttpRequest.newBuilder(URI.create(url))
                .timeout(Duration.ofSeconds(10))
                .header("User-Agent", "KitchenLedger/1.0")
                .GET()
                .build();
        try {
            HttpResponse<byte[]> response = http.send(request, HttpResponse.BodyHandlers.ofByteArray());
            byte[] body = response.body();
            if (response.statusCode() == 200 && body != null && body.length > 0 && body.length <= maxBytes) {
                return Fetch.image(body);
            }
            return Fetch.notFound();
        } catch (IOException ex) {
            return Fetch.connectionError();
        } catch (InterruptedException ex) {
            Thread.currentThread().interrupt();
            return Fetch.connectionError();
        }
    }

    /** Parses an admin-entered "host:port" proxy string, rejecting anything malformed. */
    public static Optional<InetSocketAddress> parseProxy(String value) {
        if (value == null || value.isBlank()) {
            return Optional.empty();
        }
        int colon = value.lastIndexOf(':');
        if (colon <= 0 || colon == value.length() - 1) {
            return Optional.empty();
        }
        try {
            int port = Integer.parseInt(value.substring(colon + 1).trim());
            if (port < 1 || port > 65535) {
                return Optional.empty();
            }
            return Optional.of(new InetSocketAddress(value.substring(0, colon).trim(), port));
        } catch (NumberFormatException ex) {
            return Optional.empty();
        }
    }

    /** Extracts the 11-character video id from the common YouTube URL shapes, if the URL is YouTube. */
    public static Optional<String> youTubeVideoId(String url) {
        if (url == null || url.isBlank()) {
            return Optional.empty();
        }
        URI uri;
        try {
            uri = new URI(url.trim());
        } catch (URISyntaxException ex) {
            return Optional.empty();
        }
        String host = uri.getHost();
        if (host == null) {
            return Optional.empty();
        }
        host = host.toLowerCase(Locale.ROOT);
        if (host.startsWith("www.")) {
            host = host.substring(4);
        }
        String path = uri.getPath() == null ? "" : uri.getPath();

        String candidate = null;
        if (host.equals("youtu.be")) {
            candidate = trimLeadingSlash(path);
        } else if (host.equals("youtube.com") || host.equals("m.youtube.com") || host.equals("music.youtube.com")) {
            if (path.equals("/watch")) {
                candidate = queryParam(uri.getRawQuery(), "v");
            } else if (path.startsWith("/shorts/")) {
                candidate = path.substring("/shorts/".length());
            } else if (path.startsWith("/embed/")) {
                candidate = path.substring("/embed/".length());
            } else if (path.startsWith("/live/")) {
                candidate = path.substring("/live/".length());
            }
        }
        if (candidate == null) {
            return Optional.empty();
        }
        int slash = candidate.indexOf('/');
        if (slash >= 0) {
            candidate = candidate.substring(0, slash);
        }
        return VIDEO_ID.matcher(candidate).matches() ? Optional.of(candidate) : Optional.empty();
    }

    private static String trimLeadingSlash(String path) {
        return path.startsWith("/") ? path.substring(1) : path;
    }

    private static String queryParam(String rawQuery, String name) {
        if (rawQuery == null) {
            return null;
        }
        for (String pair : rawQuery.split("&")) {
            int eq = pair.indexOf('=');
            if (eq > 0 && pair.substring(0, eq).equals(name)) {
                return pair.substring(eq + 1);
            }
        }
        return null;
    }

    public record TestResult(boolean ok, String message) {
    }

    private static final class Fetch {
        final byte[] image;
        final boolean connectionError;

        private Fetch(byte[] image, boolean connectionError) {
            this.image = image;
            this.connectionError = connectionError;
        }

        static Fetch image(byte[] data) {
            return new Fetch(data, false);
        }

        static Fetch notFound() {
            return new Fetch(null, false);
        }

        static Fetch connectionError() {
            return new Fetch(null, true);
        }
    }
}
