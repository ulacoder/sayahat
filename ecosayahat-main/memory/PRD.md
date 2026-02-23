# EcoSayahat - Ecotourism Platform for Kazakhstan

## Original Problem Statement
Build a website for ecotourism in Kazakhstan called "EcoSayahat" with:
- Green and white color scheme with nature aesthetic
- Multi-language support (Russian, English, Kazakh)
- Role-based authentication (Tourist, Taxi Driver, Admin)
- Tourist features: region selection, map, attractions with 360° views, eco-taxi, hotels, eco-tasks
- EcoCoin reward system
- AI Assistant for help

## User Personas
1. **Tourist** - explores regions, views attractions, books hotels/taxis, completes eco-tasks for EcoCoins
2. **Taxi Driver** - sees charging stations, accepts ride requests
3. **Admin** - moderates reviews, views statistics, manages platform

## Core Requirements
- **Authentication**: Registration with role selection, JWT login
- **Regions**: Caspian, Burabay, Alakol, Balkhash, Kolsay
- **Attractions**: Details, ratings/reviews, 360° views
- **EcoCoins**: Earned through eco-tasks, spent on partner hotels
- **Map**: OpenStreetMap integration showing user location and attractions

## Tech Stack
- **Frontend**: React, Tailwind CSS, Leaflet, i18next
- **Backend**: FastAPI, Motor (MongoDB)
- **Database**: MongoDB
- **360° View**: Pannellum CDN via iframe

## What's Been Implemented (Dec 2025)

### Completed Features
- [x] Full registration/login system with role selection
- [x] Multi-language UI (RU, EN, KZ)
- [x] Region selection page with 5 regions
- [x] Tourist dashboard with 6 tabs (Map, Attractions, Taxi, Hotels, Tasks, About)
- [x] Attractions display with cards, details modal, star ratings
- [x] **360° view via Pannellum CDN iframe** - stable, working
- [x] Review/rating submission system
- [x] EcoCoin balance display
- [x] Hotel listing with booking form
- [x] Taxi ordering form
- [x] Contact form in About section
- [x] AI Assistant integration (Gemini) - basic
- [x] Eco-tasks with AI verification

### API Endpoints
- POST /api/auth/register
- POST /api/auth/login
- GET /api/regions
- GET /api/regions/{region_id}/attractions
- POST /api/attractions/{id}/reviews
- GET /api/hotels/{region_id}
- POST /api/hotels/book
- POST /api/taxi/order
- GET /api/tasks
- POST /api/tasks/submit
- GET /api/ecocoins/balance
- GET /api/db/recreate (dev)

## P0 - Critical (Next)
- [ ] Admin dashboard: View and moderate pending reviews
- [ ] Taxi driver dashboard: See incoming ride requests

## P1 - Important
- [ ] Functional backend for taxi orders (store, notify)
- [ ] Hotel booking storage and confirmation
- [ ] Real-time taxi tracking on map

## P2 - Nice to Have
- [ ] EcoCoin store (spend coins on rewards)
- [ ] User profile with transaction history
- [ ] Leaderboard for eco-tasks
- [ ] Push notifications for taxi drivers

## Backlog
- Route planning on map (user → attraction)
- Weather integration
- Multi-photo galleries for attractions
- Social sharing features

## Authors
Nurtas Ulagat, Esbulat Arslan, Yertaiuly Beibarys, Tolendi Abilmansur

## Last Updated
December 23, 2025
