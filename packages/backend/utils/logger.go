package utils

import (
	"fmt"
	"log"
	"os"
	"time"

	"github.com/gin-gonic/gin"
)

// 日誌級別
const (
	LogLevelDebug = iota
	LogLevelInfo
	LogLevelWarning
	LogLevelError
	LogLevelFatal
)

var (
	// 日誌級別
	logLevel = LogLevelInfo

	// 日誌前綴
	debugPrefix   = "[DEBUG] "
	infoPrefix    = "[INFO] "
	warningPrefix = "[WARNING] "
	errorPrefix   = "[ERROR] "
	fatalPrefix   = "[FATAL] "

	// 日誌對象
	debugLogger   = log.New(os.Stdout, debugPrefix, log.LstdFlags)
	infoLogger    = log.New(os.Stdout, infoPrefix, log.LstdFlags)
	warningLogger = log.New(os.Stdout, warningPrefix, log.LstdFlags)
	errorLogger   = log.New(os.Stderr, errorPrefix, log.LstdFlags)
	fatalLogger   = log.New(os.Stderr, fatalPrefix, log.LstdFlags)
)

// SetLogLevel 設置日誌級別
func SetLogLevel(level int) {
	logLevel = level
}

// LogDebug 記錄調試信息
func LogDebug(format string, v ...interface{}) {
	if logLevel <= LogLevelDebug {
		debugLogger.Printf(format, v...)
	}
}

// LogInfo 記錄一般信息
func LogInfo(format string, v ...interface{}) {
	if logLevel <= LogLevelInfo {
		infoLogger.Printf(format, v...)
	}
}

// LogWarning 記錄警告信息
func LogWarning(format string, v ...interface{}) {
	if logLevel <= LogLevelWarning {
		warningLogger.Printf(format, v...)
	}
}

// LogError 記錄錯誤信息
func LogError(format string, v ...interface{}) {
	if logLevel <= LogLevelError {
		errorLogger.Printf(format, v...)
	}
}

// LogFatal 記錄致命錯誤並退出
func LogFatal(format string, v ...interface{}) {
	if logLevel <= LogLevelFatal {
		fatalLogger.Fatalf(format, v...)
	}
}

// LogErrorDetails 記錄錯誤詳情
func LogErrorDetails(err error, message string) {
	if logLevel <= LogLevelError {
		errorLogger.Printf("%s: %v", message, err)
	}
}

// LogRequest 記錄 HTTP 請求
func LogRequest(method, path string, params interface{}) {
	if logLevel <= LogLevelInfo {
		if params != nil {
			infoLogger.Printf("收到 %s 請求: %s, 參數: %+v", method, path, params)
		} else {
			infoLogger.Printf("收到 %s 請求: %s", method, path)
		}
	}
}

// LogResponse 記錄 HTTP 響應
func LogResponse(path string, status int, duration time.Duration) {
	if logLevel <= LogLevelInfo {
		infoLogger.Printf("請求: %s | 狀態: %d | 耗時: %v", path, status, duration)
	}
}

// LogLLMRequest 記錄 LLM 請求詳情
func LogLLMRequest(question, url string, hasScreenshot, hasPageContent, useWebSearch, isSimple bool) {
	if logLevel <= LogLevelInfo {
		infoLogger.Printf("LLM 請求: 問題=%s", question)

		if logLevel <= LogLevelDebug {
			debugLogger.Printf("LLM 請求詳情: URL=%s, 截圖=%v, 頁面內容=%v, 使用網絡搜索=%v, 簡單模式=%v",
				url, hasScreenshot, hasPageContent, useWebSearch, isSimple)
		}
	}
}

// LogLLMResponse 記錄 LLM 響應詳情
func LogLLMResponse(promptTokens, completionTokens, totalTokens int, duration time.Duration) {
	if logLevel <= LogLevelDebug {
		debugLogger.Printf("LLM 響應: 提示詞 tokens=%d, 完成 tokens=%d, 總 tokens=%d, 耗時=%v",
			promptTokens, completionTokens, totalTokens, duration)
	}
}

// FormatBytes 格式化字節大小
func FormatBytes(bytes int) string {
	const unit = 1024
	if bytes < unit {
		return fmt.Sprintf("%d B", bytes)
	}
	div, exp := int64(unit), 0
	for n := bytes / unit; n >= unit; n /= unit {
		div *= unit
		exp++
	}
	return fmt.Sprintf("%.1f %cB", float64(bytes)/float64(div), "KMGTPE"[exp])
}

// LoggerMiddleware 返回 Gin 日誌中間件
func LoggerMiddleware() gin.HandlerFunc {
	return func(c *gin.Context) {
		// 開始時間
		startTime := time.Now()

		// 處理請求
		c.Next()

		// 結束時間
		endTime := time.Now()
		// 執行時間
		latencyTime := endTime.Sub(startTime)
		// 請求方式
		reqMethod := c.Request.Method
		// 請求路由
		reqUri := c.Request.RequestURI
		// 狀態碼
		statusCode := c.Writer.Status()
		// 請求 IP
		clientIP := c.ClientIP()

		// 日誌格式
		LogDebug("[GIN] %v | %3d | %13v | %15s | %-7s %s",
			endTime.Format("2006/01/02 - 15:04:05"),
			statusCode,
			latencyTime,
			clientIP,
			reqMethod,
			reqUri,
		)
	}
}
