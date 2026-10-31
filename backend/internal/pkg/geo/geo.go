package geo

import "math"

const EarthRadiusKm = 6371.0

// CalculateDistance calculates distance between two points in kilometers using Haversine formula
func CalculateDistance(lat1, lon1, lat2, lon2 float64) float64 {
	lat1Rad := lat1 * math.Pi / 180
	lat2Rad := lat2 * math.Pi / 180
	deltaLat := (lat2 - lat1) * math.Pi / 180
	deltaLon := (lon2 - lon1) * math.Pi / 180

	a := math.Sin(deltaLat/2)*math.Sin(deltaLat/2) +
		math.Cos(lat1Rad)*math.Cos(lat2Rad)*
			math.Sin(deltaLon/2)*math.Sin(deltaLon/2)
	c := 2 * math.Atan2(math.Sqrt(a), math.Sqrt(1-a))

	return EarthRadiusKm * c
}

// IsWithinRadius checks if point2 is within radiusKm from point1
func IsWithinRadius(lat1, lon1, lat2, lon2, radiusKm float64) bool {
	return CalculateDistance(lat1, lon1, lat2, lon2) <= radiusKm
}
