package com.kitchenledger;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.boot.context.properties.ConfigurationPropertiesScan;

@SpringBootApplication
@ConfigurationPropertiesScan
public class KitchenLedgerApplication {

    public static void main(String[] args) {
        SpringApplication.run(KitchenLedgerApplication.class, args);
    }
}
