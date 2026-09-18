package com.kitchenledger.config;

import org.springframework.context.annotation.Configuration;
import org.springframework.core.io.ClassPathResource;
import org.springframework.core.io.Resource;
import org.springframework.web.servlet.config.annotation.ResourceHandlerRegistry;
import org.springframework.web.servlet.config.annotation.WebMvcConfigurer;
import org.springframework.web.servlet.resource.PathResourceResolver;

import java.io.IOException;

/**
 * Serves the packaged React build from the jar and falls back to index.html so client-side
 * routes survive a hard refresh. Only active in prod, where build-prod puts the SPA in /static.
 */
@Configuration
public class SpaWebConfig implements WebMvcConfigurer {

    private static final String STATIC_ROOT = "classpath:/static/";
    private static final ClassPathResource INDEX = new ClassPathResource("static/index.html");

    @Override
    public void addResourceHandlers(ResourceHandlerRegistry registry) {
        registry.addResourceHandler("/**")
                .addResourceLocations(STATIC_ROOT)
                .resourceChain(true)
                .addResolver(new PathResourceResolver() {
                    @Override
                    protected Resource getResource(String resourcePath, Resource location) throws IOException {
                        Resource requested = location.createRelative(resourcePath);
                        if (requested.exists() && requested.isReadable()) {
                            return requested;
                        }
                        // Unmatched API/console paths must 404 rather than render the shell.
                        if (resourcePath.startsWith("api/") || resourcePath.startsWith("actuator/")) {
                            return null;
                        }
                        return INDEX.exists() ? INDEX : null;
                    }
                });
    }
}
