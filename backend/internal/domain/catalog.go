package domain

import "time"

// CatalogProfession is an option available in provider profile forms.
type CatalogProfession struct {
	ID        string    `gorm:"primaryKey;type:uuid;default:gen_random_uuid()" json:"id"`
	Name      string    `gorm:"uniqueIndex;not null;type:varchar(255)" json:"name"`
	IsActive  bool      `gorm:"default:true;not null" json:"isActive"`
	SortOrder int       `gorm:"default:100;not null" json:"sortOrder"`
	CreatedAt time.Time `gorm:"autoCreateTime:milli" json:"createdAt"`
	UpdatedAt time.Time `gorm:"autoUpdateTime:milli" json:"updatedAt"`
}

// CatalogService is an option available in provider profile forms and search.
type CatalogService struct {
	ID        string    `gorm:"primaryKey;type:uuid;default:gen_random_uuid()" json:"id"`
	Name      string    `gorm:"uniqueIndex;not null;type:varchar(255)" json:"name"`
	IsActive  bool      `gorm:"default:true;not null" json:"isActive"`
	SortOrder int       `gorm:"default:100;not null" json:"sortOrder"`
	CreatedAt time.Time `gorm:"autoCreateTime:milli" json:"createdAt"`
	UpdatedAt time.Time `gorm:"autoUpdateTime:milli" json:"updatedAt"`
}

// VehicleBrand is a vehicle make available in profile forms.
type VehicleBrand struct {
	ID                string         `gorm:"primaryKey;type:uuid;default:gen_random_uuid()" json:"id"`
	Name              string         `gorm:"uniqueIndex;not null;type:varchar(255)" json:"name"`
	InternationalName string         `gorm:"type:varchar(255)" json:"internationalName,omitempty"`
	IsActive          bool           `gorm:"default:true;not null" json:"isActive"`
	SortOrder         int            `gorm:"default:100;not null" json:"sortOrder"`
	Models            []VehicleModel `gorm:"foreignKey:BrandID" json:"models,omitempty"`
	CreatedAt         time.Time      `gorm:"autoCreateTime:milli" json:"createdAt"`
	UpdatedAt         time.Time      `gorm:"autoUpdateTime:milli" json:"updatedAt"`
}

// VehicleModel belongs to one vehicle brand.
type VehicleModel struct {
	ID        string    `gorm:"primaryKey;type:uuid;default:gen_random_uuid()" json:"id"`
	BrandID   string    `gorm:"not null;type:uuid;uniqueIndex:idx_vehicle_model_brand_name" json:"brandId"`
	Name      string    `gorm:"not null;type:varchar(255);uniqueIndex:idx_vehicle_model_brand_name" json:"name"`
	IsActive  bool      `gorm:"default:true;not null" json:"isActive"`
	SortOrder int       `gorm:"default:100;not null" json:"sortOrder"`
	CreatedAt time.Time `gorm:"autoCreateTime:milli" json:"createdAt"`
	UpdatedAt time.Time `gorm:"autoUpdateTime:milli" json:"updatedAt"`
}
