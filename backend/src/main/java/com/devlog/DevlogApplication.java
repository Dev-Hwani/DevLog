package com.devlog;

import com.devlog.config.AppProperties;
import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.boot.context.properties.EnableConfigurationProperties;

@SpringBootApplication
@EnableConfigurationProperties(AppProperties.class)
public class DevlogApplication {
    public static void main(String[] args) {
        SpringApplication.run(DevlogApplication.class, args);
    }
}
