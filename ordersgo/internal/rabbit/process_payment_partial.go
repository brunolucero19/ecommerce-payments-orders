package rabbit

import (
	"time"

	"github.com/nmarsollier/commongo/log"
	"github.com/nmarsollier/commongo/rbt"
	"github.com/nmarsollier/ordersgo/internal/di"
	"github.com/nmarsollier/ordersgo/internal/env"
	"github.com/nmarsollier/ordersgo/internal/events"
)

// PaymentPartialMessage estructura del mensaje de pago parcial
type PaymentPartialMessage struct {
	PaymentID        string  `json:"paymentId"`
	OrderID          string  `json:"orderId"`
	UserID           string  `json:"userId"`
	Amount           float32 `json:"amount"`
	Currency         string  `json:"currency"`
	Method           string  `json:"method"`
	TransactionID    string  `json:"transactionId"`
	PaymentNumber    int     `json:"paymentNumber"`
	TotalPaidSoFar   float32 `json:"totalPaidSoFar"`
	TotalOrderAmount float32 `json:"totalOrderAmount"`
	RemainingAmount  float32 `json:"remainingAmount"`
}

func listenPaymentPartial(logger log.LogRusEntry) {
	for {
		err := rbt.ConsumeRabbitEvent[PaymentPartialMessage](
			env.Get().FluentURL,
			env.Get().RabbitURL,
			env.Get().ServerName,
			"payments_exchange",
			"topic",
			"orders_payment_partial",
			"payment.partial",
			processPaymentPartial,
		)

		if err != nil {
			logger.Error(err)
		}
		logger.Info("RabbitMQ listenPaymentPartial conectando en 5 segundos.")
		time.Sleep(5 * time.Second)
	}
}

func processPaymentPartial(logger log.LogRusEntry, newMessage *rbt.InputMessage[PaymentPartialMessage]) {
	message := newMessage.Message

	logger.WithField("orderId", message.OrderID).
		WithField("paymentId", message.PaymentID).
		WithField("amount", message.Amount).
		WithField("paymentNumber", message.PaymentNumber).
		WithField("totalPaidSoFar", message.TotalPaidSoFar).
		WithField("remainingAmount", message.RemainingAmount).
		Info("Processing payment.partial")

	// Create payment event
	paymentEvent := &events.PaymentEvent{
		OrderId:       message.OrderID,
		Method:        message.Method,
		Amount:        message.Amount,
		PaymentId:     message.PaymentID,
		TransactionId: message.TransactionID,
		Status:        "approved",
	}

	// Save event and update projection
	deps := di.NewInjector(logger)
	if _, err := deps.Service().ProcessSavePayment(paymentEvent); err != nil {
		logger.Error("Error saving payment event: ", err)
		return
	}

	logger.WithField("orderId", message.OrderID).
		WithField("paymentNumber", message.PaymentNumber).
		WithField("totalPaidSoFar", message.TotalPaidSoFar).
		Info("Partial payment processed successfully")
}
