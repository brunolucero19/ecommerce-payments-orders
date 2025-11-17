package order

import (
	"time"

	"github.com/go-playground/validator/v10"
	"github.com/nmarsollier/ordersgo/internal/events"
	"go.mongodb.org/mongo-driver/bson/primitive"
)

type OrderStatus string

const (
	Placed          OrderStatus = "placed"
	Invalid         OrderStatus = "invalid"
	Validated       OrderStatus = "validated"
	Payment_Defined OrderStatus = "payment_defined"
)

// Estuctura basica de del evento
type Order struct {
	ID      primitive.ObjectID `bson:"_id,omitempty" json:"id"`
	OrderId string             `bson:"orderId" json:"orderId" validate:"required,min=1,max=100"`
	Status  OrderStatus        `bson:"status" json:"status" validate:"required"`

	UserId   string     `bson:"userId" json:"userId" validate:"required,min=1,max=100"`
	CartId   string     `bson:"cartId" json:"cartId" validate:"required,min=1,max=100"`
	Articles []*Article `bson:"articles"  json:"articles"`

	Payments []*PaymentEvent `bson:"payments" json:"payments"`

	Created time.Time `bson:"created" json:"created"`
	Updated time.Time `bson:"updated" json:"updated"`
}

type Article struct {
	ArticleId    string  `json:"articleId" binding:"required,min=1,max=100"`
	Quantity     int     `json:"quantity" binding:"required,min=1"`
	IsValid      bool    `json:"isValid" `
	UnitaryPrice float32 `json:"unitaryPrice" `
	IsValidated  bool    `json:"isValidated" `
}

type PaymentEvent struct {
	Method events.PaymentMethod `bson:"metod" json:"method"`
	Amount float32              `bson:"amount" json:"amount"`
}

// ValidateSchema valida la estructura para ser insertada en la db
func (e *Order) ValidateSchema() error {
	return validator.New().Struct(e)
}

func (e *Order) TotalPrice() float32 {
	var result float32
	for _, a := range e.Articles {
		result += a.UnitaryPrice
	}
	return result
}

func (e *Order) TotalPayment() float32 {
	var result float32
	for _, p := range e.Payments {
		result += p.Amount
	}
	return result
}
