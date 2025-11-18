package rabbit

import (
	"time"

	"github.com/nmarsollier/commongo/log"
	"github.com/nmarsollier/commongo/rbt"
	"github.com/nmarsollier/ordersgo/internal/di"
	"github.com/nmarsollier/ordersgo/internal/env"
	"github.com/nmarsollier/ordersgo/internal/events"
)

// PaymentFailedMessage estructura del mensaje de pago fallido
type PaymentFailedMessage struct {
	PaymentID string  `json:"paymentId"`
	OrderID   string  `json:"orderId"`
	UserID    string  `json:"userId"`
	Amount    float32 `json:"amount"`
	Currency  string  `json:"currency"`
	Method    string  `json:"method"`
	Reason    string  `json:"reason"`
	ErrorCode string  `json:"errorCode"`
}

func listenPaymentFailed(logger log.LogRusEntry) {
	for {
		err := rbt.ConsumeRabbitEvent[PaymentFailedMessage](
			env.Get().FluentURL,
			env.Get().RabbitURL,
			env.Get().ServerName,
			"payments_exchange",
			"topic",
			"orders_payment_failed",
			"payment.failed",
			processPaymentFailed,
		)

		if err != nil {
			logger.Error(err)
		}
		logger.Info("RabbitMQ listenPaymentFailed conectando en 5 segundos.")
		time.Sleep(5 * time.Second)
	}
}

func processPaymentFailed(logger log.LogRusEntry, newMessage *rbt.InputMessage[PaymentFailedMessage]) {
	message := newMessage.Message

	logger.WithField("orderId", message.OrderID).
		WithField("paymentId", message.PaymentID).
		WithField("amount", message.Amount).
		WithField("reason", message.Reason).
		WithField("errorCode", message.ErrorCode).
		Info("Processing payment.failed")

	// Create payment event with rejected status
	paymentEvent := &events.PaymentEvent{
		OrderId:       message.OrderID,
		Method:        message.Method,
		Amount:        message.Amount,
		PaymentId:     message.PaymentID,
		TransactionId: "",
		Status:        "rejected",
		ErrorMessage:  message.Reason,
		ErrorCode:     message.ErrorCode,
	}

	// Save event and update projection
	deps := di.NewInjector(logger)
	if _, err := deps.Service().ProcessSavePayment(paymentEvent); err != nil {
		logger.Error("Error saving payment event: ", err)
		return
	}

	logger.WithField("orderId", message.OrderID).
		WithField("paymentId", message.PaymentID).
		WithField("errorCode", message.ErrorCode).
		Info("Failed payment processed successfully")
}
