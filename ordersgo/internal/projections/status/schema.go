package status

import (
	"time"

	"github.com/go-playground/validator/v10"
	"go.mongodb.org/mongo-driver/bson/primitive"
)

// Estuctura basica de del evento
type OrderStatus struct {
	ID      primitive.ObjectID `bson:"_id,omitempty" json:"id"`
	OrderId string             `bson:"orderId"`
	UserId  string             `bson:"userId"`

	Placed           bool `bson:"placed"`
	PartialValidated bool `bson:"partialValidated"`
	Validated        bool `bson:"validated"`
	PartialPayment   bool `bson:"partialPayment"`
	PaymentCompleted bool `bson:"paymentCompleted"`

	Created time.Time `bson:"created"`
	Updated time.Time `bson:"updated"`
}

// ValidateSchema valida la estructura para ser insertada en la db
func (e *OrderStatus) ValidateSchema() error {
	return validator.New().Struct(e)
}
