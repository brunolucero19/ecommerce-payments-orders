package rabbit

import (
	"time"

	"github.com/nmarsollier/commongo/log"
	"github.com/nmarsollier/commongo/rbt"
	"github.com/nmarsollier/ordersgo/internal/di"
	"github.com/nmarsollier/ordersgo/internal/env"
	"github.com/nmarsollier/ordersgo/internal/events"
)

// PaymentRefundedMessage estructura del mensaje de reembolso
type PaymentRefundedMessage struct {
	PaymentID     string  `json:"paymentId"`
	OrderID       string  `json:"orderId"`
	UserID        string  `json:"userId"`
	Amount        float32 `json:"amount"`
	Currency      string  `json:"currency"`
	Method        string  `json:"method"`
	TransactionID string  `json:"transactionId"`
	Reason        string  `json:"reason"`
}

func listenPaymentRefunded(logger log.LogRusEntry) {
	for {
		err := rbt.ConsumeRabbitEvent[PaymentRefundedMessage](
			env.Get().FluentURL,
			env.Get().RabbitURL,
			env.Get().ServerName,
			"payments_exchange",
			"topic",
			"orders_payment_refunded",
			"payment.refunded",
			processPaymentRefunded,
		)

		if err != nil {
			logger.Error(err)
		}
		logger.Info("RabbitMQ listenPaymentRefunded conectando en 5 segundos.")
		time.Sleep(5 * time.Second)
	}
}

func processPaymentRefunded(logger log.LogRusEntry, newMessage *rbt.InputMessage[PaymentRefundedMessage]) {
	message := newMessage.Message

	logger.WithField("orderId", message.OrderID).
		WithField("paymentId", message.PaymentID).
		WithField("amount", message.Amount).
		WithField("reason", message.Reason).
		Info("Processing payment.refunded")

	// Create payment event with refunded status
	paymentEvent := &events.PaymentEvent{
		OrderId:       message.OrderID,
		Method:        message.Method,
		Amount:        message.Amount,
		PaymentId:     message.PaymentID,
		TransactionId: message.TransactionID,
		Status:        "refunded",
	}

	// Save event and update projection
	deps := di.NewInjector(logger)
	if _, err := deps.Service().ProcessSavePayment(paymentEvent); err != nil {
		logger.Error("Error saving payment event: ", err)
		return
	}

	logger.WithField("orderId", message.OrderID).
		WithField("paymentId", message.PaymentID).
		Info("Refunded payment processed successfully")
}
