package rabbit

import (
	"encoding/json"

	"github.com/nmarsollier/commongo/log"
	"github.com/nmarsollier/commongo/rbt"
	"github.com/nmarsollier/ordersgo/internal/di"
	"github.com/nmarsollier/ordersgo/internal/events"
	"github.com/nmarsollier/ordersgo/internal/projections"
	"github.com/nmarsollier/ordersgo/internal/services"
	"github.com/streadway/amqp"
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
	logger.Info("Payment Refunded Consumer starting...")

	conn, err := rbt.Get(di.NewInjector(nil))
	if err != nil {
		logger.Error(err)
		return
	}

	channel, err := conn.Channel()
	if err != nil {
		logger.Error(err)
		return
	}
	defer channel.Close()

	err = channel.ExchangeDeclare(
		"payments_exchange", // name
		"topic",             // type
		true,                // durable
		false,               // auto-deleted
		false,               // internal
		false,               // no-wait
		nil,                 // arguments
	)
	if err != nil {
		logger.Error(err)
		return
	}

	queue, err := channel.QueueDeclare(
		"orders_payment_refunded", // name
		true,                       // durable
		false,                      // delete when unused
		false,                      // exclusive
		false,                      // no-wait
		nil,                        // arguments
	)
	if err != nil {
		logger.Error(err)
		return
	}

	err = channel.QueueBind(
		queue.Name,          // queue name
		"payment.refunded",  // routing key
		"payments_exchange", // exchange
		false,
		nil,
	)
	if err != nil {
		logger.Error(err)
		return
	}

	messages, err := channel.Consume(
		queue.Name, // queue
		"",         // consumer
		false,      // auto-ack
		false,      // exclusive
		false,      // no-local
		false,      // no-wait
		nil,        // args
	)
	if err != nil {
		logger.Error(err)
		return
	}

	logger.Info("Payment Refunded Consumer started successfully")

	go func() {
		for d := range messages {
			logger.Info("Payment Refunded message received")

			if err := processPaymentRefunded(d, logger); err != nil {
				logger.Error(err)
				d.Nack(false, true) // Nack with requeue
			} else {
				d.Ack(false)
			}
		}
	}()
}

func processPaymentRefunded(d amqp.Delivery, logger log.LogRusEntry) error {
	// Parse message
	var message PaymentRefundedMessage
	if err := json.Unmarshal(d.Body, &message); err != nil {
		logger.Error("Error parsing payment.refunded message: ", err)
		return err
	}

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
	service := services.NewService(logger, events.NewEventService(logger), projections.NewProjectionsService(logger), nil, nil)
	if _, err := service.ProcessSavePayment(paymentEvent); err != nil {
		logger.Error("Error saving payment event: ", err)
		return err
	}

	logger.WithField("orderId", message.OrderID).
		WithField("paymentId", message.PaymentID).
		Info("Refunded payment processed successfully")

	return nil
}
