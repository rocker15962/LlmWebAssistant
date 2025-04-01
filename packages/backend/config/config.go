package config

import (
	"os"
	"strconv"
)

// 環境變數名稱常量
const (
	EnvGinMode        = "GIN_MODE"
	EnvPort           = "PORT"
	EnvLLMApiKey      = "LLM_API_KEY"
	EnvLLMApiEndpoint = "LLM_API_ENDPOINT"
	EnvLLMModel       = "LLM_MODEL"
	EnvDebug          = "DEBUG"
)

// Config 應用配置
type Config struct {
	GinMode        string
	Port           int
	LLMApiKey      string
	LLMApiEndpoint string
	LLMModel       string
	Debug          bool
}

// LoadConfig 從環境變數載入配置
func LoadConfig() Config {
	port, _ := strconv.Atoi(getEnvOrDefault(EnvPort, "8080"))

	return Config{
		GinMode:        getEnvOrDefault(EnvGinMode, "debug"),
		Port:           port,
		LLMApiKey:      os.Getenv(EnvLLMApiKey),
		LLMApiEndpoint: getEnvOrDefault(EnvLLMApiEndpoint, "https://api.openai.com/v1/responses"),
		LLMModel:       getEnvOrDefault(EnvLLMModel, "gpt-4o-mini"),
		Debug:          os.Getenv(EnvDebug) == "true",
	}
}

// IsProduction 檢查是否為生產環境
func IsProduction() bool {
	return os.Getenv(EnvGinMode) == "release"
}

// getEnvOrDefault 獲取環境變數，如果不存在則返回默認值
func getEnvOrDefault(key, defaultValue string) string {
	value := os.Getenv(key)
	if value == "" {
		return defaultValue
	}
	return value
}

// GetPort 返回服務器端口
func GetPort() string {
	port := os.Getenv("PORT")
	if port == "" {
		port = "8080" // 默認端口
	}
	return port
}

// GetLLMAPIKey 返回 LLM API 密鑰
func GetLLMAPIKey() string {
	return os.Getenv("LLM_API_KEY")
}

// GetLLMAPIURL 返回 LLM API URL
func GetLLMAPIURL() string {
	url := os.Getenv("LLM_API_URL")
	if url == "" {
		// 默認使用 OpenAI API 的 chat/completions 端點
		url = "https://api.openai.com/v1/chat/completions"
	}
	return url
}

// GetWebSearchAPIURL 返回 Web Search API URL
func GetWebSearchAPIURL() string {
	url := os.Getenv("WEB_SEARCH_API_URL")
	if url == "" {
		// 默認使用 OpenAI API 的 responses 端點
		url = "https://api.openai.com/v1/responses"
	}
	return url
}

// GetMaxContentLength 返回最大內容長度限制
func GetMaxContentLength() int {
	return 100000 // 約 100KB
}

// GetMaxImageSize 返回最大圖像大小限制
func GetMaxImageSize() int {
	return 1024 * 1024 * 5 // 5MB
}
