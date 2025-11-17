package rbschema

import "github.com/nmarsollier/commongo/rbt"

type PlacedDataPublisher = rbt.RabbitPublisher[*OrderPlacedData]

type ArticleValidationPublisher = rbt.RabbitPublisher[*ArticleValidationData]

type OrderPlacedData struct {
	OrderId string `json:"orderId"`

	CartId string `json:"cartId"`

	UserId string `json:"userId"`

	Articles []ArticlePlacedData `json:"articles"`
}

type ArticlePlacedData struct {
	ArticleId string `json:"articleId"`

	Quantity int `json:"quantity"`
}

type ArticleValidationData struct {
	ReferenceId string `json:"referenceId"`

	ArticleId string `json:"articleId"`
}
