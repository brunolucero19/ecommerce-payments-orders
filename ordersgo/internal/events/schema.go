package events

import (
	"time"

	"github.com/go-playground/validator/v10"
	uuid "github.com/satori/go.uuid"
	"go.mongodb.org/mongo-driver/bson/primitive"
)

type PaymentMethod string

const (
	Cash   PaymentMethod = "CASH"
	Credit PaymentMethod = "CREDIT"
	Debit  PaymentMethod = "DEBIT"
)

type EventType string

const (
	Place      EventType = "place_order"
	Validation EventType = "aticle_validation"
	Payment    EventType = "payment"
)

// Estuctura basica de del evento
type Event struct {
	ID         primitive.ObjectID `bson:"_id,omitempty"`
	OrderId    string             `bson:"orderId" validate:"required,min=1,max=100"`
	Type       EventType          `bson:"type" validate:"required"`
	PlaceEvent *PlaceEvent        `bson:"placeEvent"`
	Validation *ValidationEvent   `bson:"validation"`
	Payment    *PaymentEvent      `bson:"payment"`
	Created    time.Time          `bson:"created"`
	Updated    time.Time          `bson:"updated"`
}

// ValidateSchema valida la estructura para ser insertada en la db
func (e *Event) ValidateSchema() error {
	return validator.New().Struct(e)
}

type PlaceEvent struct {
	CartId   string    `bson:"cartId"`
	UserId   string    `bson:"userId" `
	Articles []Article `bson:"articles" `
}

type Article struct {
	ArticleId string `json:"articleId" binding:"required,min=1,max=100"`
	Quantity  int    `json:"quantity" binding:"required,min=1"`
}

type PaymentEvent struct {
	OrderId string        `bson:"orderId" binding:"required"`
	Method  PaymentMethod `bson:"metod" binding:"required"`
	Amount  float32       `bson:"amount" binding:"required"`
}

type ValidationEvent struct {
	ArticleId   string  `bson:"articleId" json:"articleId"`
	ReferenceId string  `bson:"referenceId" json:"referenceId"`
	IsValid     bool    `bson:"isValid" json:"valid"`
	Stock       int     `bson:"stock" json:"stock"`
	Price       float32 `bson:"price" json:"price"`
}

// NewPlaceEvent Nueva instancia de place event
func newPlaceEvent(
	event *PlaceEvent,
) *Event {
	return &Event{
		OrderId:    uuid.NewV4().String(),
		Type:       Place,
		PlaceEvent: event,
		Created:    time.Now(),
		Updated:    time.Now(),
	}
}

// PaymentEvent Nueva instancia de payment event
func newPaymentEvent(
	paymentEvent *PaymentEvent,
) *Event {
	return &Event{
		OrderId: paymentEvent.OrderId,
		Type:    Payment,
		Payment: paymentEvent,
		Created: time.Now(),
		Updated: time.Now(),
	}
}

// ValidationEvent Nueva instancia de validation event
func newValidationEvent(
	validationEvent *ValidationEvent,
) *Event {
	return &Event{
		OrderId:    validationEvent.ReferenceId,
		Type:       Validation,
		Validation: validationEvent,
		Created:    time.Now(),
		Updated:    time.Now(),
	}
}
