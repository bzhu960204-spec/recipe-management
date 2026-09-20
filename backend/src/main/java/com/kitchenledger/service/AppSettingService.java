package com.kitchenledger.service;

import com.kitchenledger.domain.AppSetting;
import com.kitchenledger.repository.AppSettingRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.Optional;

/** Reads and writes runtime-editable settings. A blank value clears the setting (= use the default). */
@Service
public class AppSettingService {

    private final AppSettingRepository repository;

    public AppSettingService(AppSettingRepository repository) {
        this.repository = repository;
    }

    @Transactional(readOnly = true)
    public Optional<String> get(String key) {
        return repository.findById(key)
                .map(AppSetting::getValue)
                .filter(value -> value != null && !value.isBlank());
    }

    @Transactional
    public void put(String key, String value) {
        if (value == null || value.isBlank()) {
            repository.findById(key).ifPresent(repository::delete);
            return;
        }
        AppSetting setting = repository.findById(key).orElseGet(() -> new AppSetting(key));
        setting.setValue(value);
        repository.save(setting);
    }
}
