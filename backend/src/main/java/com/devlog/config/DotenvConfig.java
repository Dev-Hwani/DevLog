package com.devlog.config;

import org.springframework.context.annotation.Configuration;
import org.springframework.context.annotation.PropertySource;

@Configuration
@PropertySource(
    value = "file:.env",
    ignoreResourceNotFound = true,
    factory = DotenvPropertySourceFactory.class
)
public class DotenvConfig {
}
