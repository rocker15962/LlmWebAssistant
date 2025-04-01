package handlers

import (
	"fmt"
	"net/http"
	"time"

	"github.com/gin-gonic/gin"

	"github.com/rocker15962/llm-web-assistant/packages/backend/models"
	"github.com/rocker15962/llm-web-assistant/packages/backend/utils"
)

// HandleHealth 處理健康檢查請求
func HandleHealth(c *gin.Context) {
	utils.LogInfo("健康檢查請求")
	c.JSON(http.StatusOK, gin.H{
		"status":  "ok",
		"message": "服務正常運行",
	})
}

// HandleAsk 處理 LLM 問答請求
func HandleAsk(c *gin.Context) {
	startTime := time.Now()

	// 記錄請求
	utils.LogRequest("POST", "/api/ask", nil)

	// 解析請求
	var req models.AskRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		utils.LogError("無效的請求格式: %v", err)
		c.JSON(http.StatusBadRequest, gin.H{
			"error": fmt.Sprintf("無效的請求格式: %v", err),
		})
		return
	}

	// 記錄請求詳情
	hasScreenshot := req.Screenshot != ""
	hasPageContent := req.PageContent != ""

	utils.LogLLMRequest(
		req.Question,
		req.URL,
		hasScreenshot,
		hasPageContent,
		req.UseWebSearch,
		req.IsSimple,
	)

	// 記錄數據大小
	if hasScreenshot {
		utils.LogDebug("截圖大小: %s", utils.FormatBytes(len(req.Screenshot)))
	}
	if hasPageContent {
		utils.LogDebug("頁面內容大小: %s", utils.FormatBytes(len(req.PageContent)))
	}

	// 使用 GenerateResponse 函數
	response, err := utils.GenerateResponse(req)

	if err != nil {
		utils.LogErrorDetails(err, "生成回答時出錯")

		// 返回詳細的錯誤信息
		c.JSON(http.StatusInternalServerError, gin.H{
			"error":  fmt.Sprintf("%v", err),
			"detail": "請檢查日誌獲取更多信息",
		})
		return
	}

	// 記錄響應詳情
	utils.LogLLMResponse(
		response.Usage.PromptTokens,
		response.Usage.CompletionTokens,
		response.Usage.TotalTokens,
		time.Since(startTime),
	)

	// 返回回應
	c.JSON(http.StatusOK, response)

	// 記錄響應時間
	utils.LogResponse("/api/ask", http.StatusOK, time.Since(startTime))
}
