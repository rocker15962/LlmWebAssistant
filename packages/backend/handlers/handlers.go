package handlers

import (
	"fmt"
	"net/http"

	"github.com/gin-gonic/gin"

	"github.com/rocker15962/llm-web-assistant/packages/backend/models"
	"github.com/rocker15962/llm-web-assistant/packages/backend/utils"
)

// HandleHealth 處理健康檢查請求
func HandleHealth(c *gin.Context) {
	c.JSON(http.StatusOK, gin.H{
		"status":  "ok",
		"message": "服務正常運行",
	})
}

// HandleAsk 處理 LLM 問答請求
func HandleAsk(c *gin.Context) {
	// 解析請求
	var req models.AskRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"error": fmt.Sprintf("無效的請求格式: %v", err),
		})
		return
	}

	// 使用 GenerateResponse 函數
	response, err := utils.GenerateResponse(req)

	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"error": fmt.Sprintf("生成回答時出錯: %v", err),
		})
		return
	}

	// 返回回應
	c.JSON(http.StatusOK, response)
}
