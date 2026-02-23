from fastapi import FastAPI, APIRouter, HTTPException, Depends, UploadFile, File
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import logging
import uuid
from pathlib import Path
from datetime import datetime, timezone
from typing import List, Optional
import asyncio

from models import (
    User, UserRegister, UserLogin, Region, Attraction, Review, ReviewCreate,
    Hotel, TaxiOrder, TaxiOrderCreate, Task, TaskSubmission, TaskSubmissionCreate,
    EcocoinTransaction, ChargingStation, AIMessage
)
from auth import (
    hash_password, verify_password, create_access_token, get_current_user
)

from emergentintegrations.llm.chat import LlmChat, UserMessage, ImageContent

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

app = FastAPI()
api_router = APIRouter(prefix="/api")

EMERGENT_LLM_KEY = os.environ.get("EMERGENT_LLM_KEY", "")

@api_router.post("/auth/register")
async def register(user_data: UserRegister):
    existing_user = await db.users.find_one({"email": user_data.email}, {"_id": 0})
    if existing_user:
        raise HTTPException(status_code=400, detail="Email already registered")
    
    user = User(
        email=user_data.email,
        name=user_data.name,
        role=user_data.role,
        ecocoin_balance=100,
        created_at=datetime.now(timezone.utc).isoformat()
    )
    
    user_dict = user.model_dump()
    user_dict["password_hash"] = hash_password(user_data.password)
    
    await db.users.insert_one(user_dict)
    
    token = create_access_token(user.id, user.email, user.role)
    return {"token": token, "user": user}

@api_router.post("/auth/login")
async def login(credentials: UserLogin):
    user_data = await db.users.find_one({"email": credentials.email}, {"_id": 0})
    if not user_data:
        raise HTTPException(status_code=401, detail="Invalid credentials")
    
    if not verify_password(credentials.password, user_data["password_hash"]):
        raise HTTPException(status_code=401, detail="Invalid credentials")
    
    user = User(**user_data)
    token = create_access_token(user.id, user.email, user.role)
    return {"token": token, "user": user}

@api_router.get("/auth/me", response_model=User)
async def get_me(current_user: dict = Depends(get_current_user)):
    user_data = await db.users.find_one({"id": current_user["user_id"]}, {"_id": 0})
    if not user_data:
        raise HTTPException(status_code=404, detail="User not found")
    return User(**user_data)

@api_router.get("/regions", response_model=List[Region])
async def get_regions():
    regions = await db.regions.find({}, {"_id": 0}).to_list(100)
    if not regions:
        await init_regions()
        regions = await db.regions.find({}, {"_id": 0}).to_list(100)
    return [Region(**r) for r in regions]

@api_router.get("/regions/{region_id}/attractions", response_model=List[Attraction])
async def get_attractions(region_id: str):
    attractions = await db.attractions.find({"region_id": region_id}, {"_id": 0}).to_list(100)
    return [Attraction(**a) for a in attractions]

@api_router.get("/attractions/{attraction_id}", response_model=Attraction)
async def get_attraction(attraction_id: str):
    attraction = await db.attractions.find_one({"id": attraction_id}, {"_id": 0})
    if not attraction:
        raise HTTPException(status_code=404, detail="Attraction not found")
    return Attraction(**attraction)

@api_router.get("/attractions/{attraction_id}/reviews", response_model=List[Review])
async def get_reviews(attraction_id: str):
    reviews = await db.reviews.find(
        {"attraction_id": attraction_id, "status": "approved"}, 
        {"_id": 0}
    ).sort("created_at", -1).to_list(100)
    return [Review(**r) for r in reviews]

@api_router.post("/attractions/{attraction_id}/reviews", response_model=Review)
async def create_review(attraction_id: str, review_data: ReviewCreate, current_user: dict = Depends(get_current_user)):
    user_data = await db.users.find_one({"id": current_user["user_id"]}, {"_id": 0})
    
    review = Review(
        attraction_id=attraction_id,
        user_id=current_user["user_id"],
        user_name=user_data["name"],
        rating=review_data.rating,
        comment=review_data.comment,
        status="pending",
        created_at=datetime.now(timezone.utc).isoformat()
    )
    
    await db.reviews.insert_one(review.model_dump())
    return review

@api_router.get("/hotels/{region_id}", response_model=List[Hotel])
async def get_hotels(region_id: str):
    hotels = await db.hotels.find({"region_id": region_id}, {"_id": 0}).to_list(100)
    if not hotels:
        await init_hotels()
        hotels = await db.hotels.find({"region_id": region_id}, {"_id": 0}).to_list(100)
    return [Hotel(**h) for h in hotels]

@api_router.post("/hotels/book")
async def book_hotel(hotel_id: str, check_in: str, check_out: str, guests: int, current_user: dict = Depends(get_current_user)):
    hotel = await db.hotels.find_one({"id": hotel_id}, {"_id": 0})
    if not hotel:
        raise HTTPException(status_code=404, detail="Hotel not found")
    
    booking = {
        "id": str(uuid.uuid4()),
        "user_id": current_user["user_id"],
        "hotel_id": hotel_id,
        "hotel_name": hotel["name"],
        "check_in": check_in,
        "check_out": check_out,
        "guests": guests,
        "total_price": hotel["price_per_night"],
        "payment_status": "completed",
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    
    await db.bookings.insert_one(booking)
    
    if hotel["is_partner"]:
        user = await db.users.find_one({"id": current_user["user_id"]}, {"_id": 0})
        coins_used = min(100, user.get("ecocoin_balance", 0))
        if coins_used > 0:
            await db.users.update_one(
                {"id": current_user["user_id"]},
                {"$inc": {"ecocoin_balance": -coins_used}}
            )
            transaction = EcocoinTransaction(
                user_id=current_user["user_id"],
                amount=-coins_used,
                type="spent",
                description=f"Hotel booking: {hotel['name']}",
                created_at=datetime.now(timezone.utc).isoformat()
            )
            await db.ecocoin_transactions.insert_one(transaction.model_dump())
    
    return {"message": "Booking successful", "booking": booking}

@api_router.post("/contact/send")
async def send_contact_email(name: str, email: str, message: str):
    contact_message = {
        "id": str(uuid.uuid4()),
        "name": name,
        "email": email,
        "message": message,
        "created_at": datetime.now(timezone.utc).isoformat(),
        "status": "sent"
    }
    
    await db.contact_messages.insert_one(contact_message)
    logging.info(f"Contact form submitted: {name} ({email}) - {message[:50]}...")
    
    return {"message": "Message sent successfully", "contact_email": "contact@ecosayahat.kz"}


@api_router.post("/taxi/order", response_model=TaxiOrder)
async def create_taxi_order(order_data: TaxiOrderCreate, current_user: dict = Depends(get_current_user)):
    order = TaxiOrder(
        user_id=current_user["user_id"],
        from_location=order_data.from_location,
        to_location=order_data.to_location,
        from_lat=order_data.from_lat,
        from_lng=order_data.from_lng,
        to_lat=order_data.to_lat,
        to_lng=order_data.to_lng,
        status="pending",
        created_at=datetime.now(timezone.utc).isoformat()
    )
    
    await db.taxi_orders.insert_one(order.model_dump())
    return order

@api_router.get("/taxi/orders", response_model=List[TaxiOrder])
async def get_taxi_orders(current_user: dict = Depends(get_current_user)):
    if current_user["role"] == "taxi_driver":
        orders = await db.taxi_orders.find({"status": "pending"}, {"_id": 0}).to_list(100)
    else:
        orders = await db.taxi_orders.find({"user_id": current_user["user_id"]}, {"_id": 0}).to_list(100)
    return [TaxiOrder(**o) for o in orders]

@api_router.post("/taxi/accept/{order_id}")
async def accept_taxi_order(order_id: str, current_user: dict = Depends(get_current_user)):
    if current_user["role"] != "taxi_driver":
        raise HTTPException(status_code=403, detail="Only taxi drivers can accept orders")
    
    result = await db.taxi_orders.update_one(
        {"id": order_id, "status": "pending"},
        {"$set": {"driver_id": current_user["user_id"], "status": "accepted"}}
    )
    
    if result.modified_count == 0:
        raise HTTPException(status_code=404, detail="Order not found or already accepted")
    
    return {"message": "Order accepted"}

@api_router.get("/charging-stations", response_model=List[ChargingStation])
async def get_charging_stations():
    stations = await db.charging_stations.find({}, {"_id": 0}).to_list(100)
    if not stations:
        await init_charging_stations()
        stations = await db.charging_stations.find({}, {"_id": 0}).to_list(100)
    return [ChargingStation(**s) for s in stations]

@api_router.get("/tasks", response_model=List[Task])
async def get_tasks():
    tasks = await db.tasks.find({}, {"_id": 0}).to_list(100)
    if not tasks:
        await init_tasks()
        tasks = await db.tasks.find({}, {"_id": 0}).to_list(100)
    return [Task(**t) for t in tasks]

@api_router.post("/tasks/submit", response_model=TaskSubmission)
async def submit_task(submission_data: TaskSubmissionCreate, current_user: dict = Depends(get_current_user)):
    submission = TaskSubmission(
        user_id=current_user["user_id"],
        task_id=submission_data.task_id,
        image_base64=submission_data.image_base64,
        status="verifying",
        created_at=datetime.now(timezone.utc).isoformat()
    )
    
    await db.task_submissions.insert_one(submission.model_dump())
    
    asyncio.create_task(verify_task_submission(submission.id, submission_data.task_id, submission_data.image_base64, current_user["user_id"]))
    
    return submission

async def verify_task_submission(submission_id: str, task_id: str, image_base64: str, user_id: str):
    try:
        task = await db.tasks.find_one({"id": task_id}, {"_id": 0})
        if not task:
            return
        
        chat = LlmChat(
            api_key=EMERGENT_LLM_KEY,
            session_id=f"task_verify_{submission_id}",
            system_message="You are an eco-task verification assistant. Analyze the image and determine if it shows the user completing an eco-friendly task like recycling, cleaning, or visiting nature. Respond with 'VERIFIED' if valid, or 'REJECTED' if not."
        ).with_model("gemini", "gemini-3-flash-preview")
        
        image_content = ImageContent(image_base64=image_base64)
        user_message = UserMessage(
            text=f"Task: {task['title_en']}. Description: {task['description_en']}. Does this image show completion of this task?",
            file_contents=[image_content]
        )
        
        response = await chat.send_message(user_message)
        
        if "VERIFIED" in response.upper():
            await db.task_submissions.update_one(
                {"id": submission_id},
                {"$set": {"status": "approved", "verified_at": datetime.now(timezone.utc).isoformat()}}
            )
            
            await db.users.update_one(
                {"id": user_id},
                {"$inc": {"ecocoin_balance": task["reward_coins"]}}
            )
            
            transaction = EcocoinTransaction(
                user_id=user_id,
                amount=task["reward_coins"],
                type="earned",
                description=f"Task completed: {task['title_en']}",
                created_at=datetime.now(timezone.utc).isoformat()
            )
            await db.ecocoin_transactions.insert_one(transaction.model_dump())
        else:
            await db.task_submissions.update_one(
                {"id": submission_id},
                {"$set": {"status": "rejected", "verified_at": datetime.now(timezone.utc).isoformat()}}
            )
    except Exception as e:
        logging.error(f"Error verifying task: {e}")
        await db.task_submissions.update_one(
            {"id": submission_id},
            {"$set": {"status": "error"}}
        )

@api_router.get("/ecocoins/balance")
async def get_balance(current_user: dict = Depends(get_current_user)):
    user = await db.users.find_one({"id": current_user["user_id"]}, {"_id": 0, "ecocoin_balance": 1})
    return {"balance": user.get("ecocoin_balance", 0)}

@api_router.get("/ecocoins/transactions", response_model=List[EcocoinTransaction])
async def get_transactions(current_user: dict = Depends(get_current_user)):
    transactions = await db.ecocoin_transactions.find(
        {"user_id": current_user["user_id"]},
        {"_id": 0}
    ).sort("created_at", -1).to_list(100)
    return [EcocoinTransaction(**t) for t in transactions]

@api_router.get("/ecocoins/leaderboard")
async def get_leaderboard():
    users = await db.users.find(
        {"role": "tourist"},
        {"_id": 0, "name": 1, "ecocoin_balance": 1}
    ).sort("ecocoin_balance", -1).limit(10).to_list(10)
    return users

@api_router.post("/ai-assistant/chat")
async def ai_chat(message_data: AIMessage, current_user: dict = Depends(get_current_user)):
    try:
        chat = LlmChat(
            api_key=EMERGENT_LLM_KEY,
            session_id=f"user_{current_user['user_id']}",
            system_message=f"""You are EcoSayahat AI Assistant. You help tourists in Kazakhstan with eco-tourism information.
You speak multiple languages: Russian, English, and Kazakh. Respond in {message_data.language}.
You can answer questions about regions (Caspian, Burabay, Alakol, Balkhash, Kolsay), attractions, hotels, eco-tasks, and eco-coins.
Be friendly, helpful, and encourage eco-friendly behavior."""
        ).with_model("gemini", "gemini-3-flash-preview")
        
        if message_data.image_base64:
            image_content = ImageContent(image_base64=message_data.image_base64)
            user_message = UserMessage(
                text=message_data.message,
                file_contents=[image_content]
            )
        else:
            user_message = UserMessage(text=message_data.message)
        
        response = await chat.send_message(user_message)
        return {"response": response}
    except Exception as e:
        logging.error(f"AI chat error: {e}")
        raise HTTPException(status_code=500, detail="AI assistant error")

@api_router.get("/admin/reviews", response_model=List[Review])
async def get_all_reviews(current_user: dict = Depends(get_current_user)):
    if current_user["role"] != "admin":
        raise HTTPException(status_code=403, detail="Admin only")
    
    reviews = await db.reviews.find({}, {"_id": 0}).sort("created_at", -1).to_list(100)
    return [Review(**r) for r in reviews]

@api_router.post("/admin/reviews/{review_id}/approve")
async def approve_review(review_id: str, current_user: dict = Depends(get_current_user)):
    if current_user["role"] != "admin":
        raise HTTPException(status_code=403, detail="Admin only")
    
    await db.reviews.update_one({"id": review_id}, {"$set": {"status": "approved"}})
    return {"message": "Review approved"}

@api_router.post("/admin/reviews/{review_id}/reject")
async def reject_review(review_id: str, current_user: dict = Depends(get_current_user)):
    if current_user["role"] != "admin":
        raise HTTPException(status_code=403, detail="Admin only")
    
    await db.reviews.update_one({"id": review_id}, {"$set": {"status": "rejected"}})
    return {"message": "Review rejected"}

@api_router.get("/admin/stats")
async def get_admin_stats(current_user: dict = Depends(get_current_user)):
    if current_user["role"] != "admin":
        raise HTTPException(status_code=403, detail="Admin only")
    
    total_users = await db.users.count_documents({})
    total_orders = await db.taxi_orders.count_documents({})
    total_tasks = await db.task_submissions.count_documents({"status": "approved"})
    pending_reviews = await db.reviews.count_documents({"status": "pending"})
    
    return {
        "total_users": total_users,
        "total_orders": total_orders,
        "total_tasks_completed": total_tasks,
        "pending_reviews": pending_reviews
    }

@api_router.get("/db/recreate")
async def recreate_database():
    """Recreate all initial data - for development use only"""
    await db.regions.delete_many({})
    await db.attractions.delete_many({})
    await db.hotels.delete_many({})
    await db.tasks.delete_many({})
    await db.charging_stations.delete_many({})
    
    await init_regions()
    await init_hotels()
    await init_tasks()
    await init_charging_stations()
    
    return {"message": "Database recreated successfully"}

async def init_regions():
    regions = [
        {
            "id": "caspian",
            "name_ru": "Каспий",
            "name_en": "Caspian",
            "name_kz": "Каспий",
            "description_ru": "Побережье Каспийского моря с уникальными пляжами и природой",
            "description_en": "Caspian Sea coast with unique beaches and nature",
            "description_kz": "Каспий теңізінің жағалауы ерекше жағажайлары мен табиғатымен",
            "image_url": "https://images.pexels.com/photos/20591591/pexels-photo-20591591.jpeg?auto=compress&cs=tinysrgb&dpr=2&h=650&w=940"
        },
        {
            "id": "burabay",
            "name_ru": "Бурабай",
            "name_en": "Burabay",
            "name_kz": "Бұрабай",
            "description_ru": "Национальный парк с живописными озерами и горами",
            "description_en": "National park with picturesque lakes and mountains",
            "description_kz": "Көрнекі көлдері мен таулары бар ұлттық саябақ",
            "image_url": "https://images.unsplash.com/photo-1761829717820-98dff45b8d9f?crop=entropy&cs=srgb&fm=jpg&ixid=M3w4NjA2ODl8MHwxfHNlYXJjaHwxfHxCdXJhYmF5JTIwTmF0aW9uYWwlMjBQYXJrJTIwS2F6YWtoc3RhbiUyMGxha2UlMjBmb3Jlc3R8ZW58MHx8fHwxNzcxNjA1ODU3fDA&ixlib=rb-4.1.0&q=85"
        },
        {
            "id": "alakol",
            "name_ru": "Алаколь",
            "name_en": "Alakol",
            "name_kz": "Алакөл",
            "description_ru": "Целебное озеро с минеральными водами",
            "description_en": "Healing lake with mineral waters",
            "description_kz": "Минералды сулары бар емдік көл",
            "image_url": "https://images.pexels.com/photos/13544773/pexels-photo-13544773.jpeg?auto=compress&cs=tinysrgb&dpr=2&h=650&w=940"
        },
        {
            "id": "balkhash",
            "name_ru": "Балхаш",
            "name_en": "Balkhash",
            "name_kz": "Балқаш",
            "description_ru": "Уникальное озеро с пресной и соленой водой",
            "description_en": "Unique lake with fresh and salt water",
            "description_kz": "Тұщы және тұзды суы бар бірегей көл",
            "image_url": "https://images.pexels.com/photos/32849826/pexels-photo-32849826.jpeg?auto=compress&cs=tinysrgb&dpr=2&h=650&w=940"
        },
        {
            "id": "kolsay",
            "name_ru": "Кольсай",
            "name_en": "Kolsay",
            "name_kz": "Көлсай",
            "description_ru": "Каскад горных озер в Алматинской области",
            "description_en": "Cascade of mountain lakes in Almaty region",
            "description_kz": "Алматы облысындағы тау көлдерінің каскады",
            "image_url": "https://images.pexels.com/photos/24816020/pexels-photo-24816020.jpeg?auto=compress&cs=tinysrgb&dpr=2&h=650&w=940"
        }
    ]
    
    await db.regions.insert_many(regions)
    
    attractions = [
        {
            "id": "zhumbaktas",
            "region_id": "burabay",
            "name_ru": "Скала Жумбактас",
            "name_en": "Zhumbaktas Rock",
            "name_kz": "Жұмбақтас жартасы",
            "description_ru": "Знаменитая скала в форме сфинкса высотой 20 метров на озере Боровое. Название переводится как 'камень-загадка'. По легенде, скала меняет свою форму в зависимости от точки обзора. Это одна из самых узнаваемых природных достопримечательностей Казахстана, окутанная множеством легенд и преданий.",
            "description_en": "Famous sphinx-shaped rock 20 meters high on Lake Borovoye. The name translates as 'mystery stone'. According to legend, the rock changes its shape depending on the viewing point. This is one of the most recognizable natural attractions in Kazakhstan, shrouded in many legends.",
            "description_kz": "Боровое көлінде биіктігі 20 метр сфинкс пішінді әйгілі жартас. Аты 'жұмбақ тас' деп аударылады. Аңызға сәйкес, жартас қарау нүктесіне байланысты пішінін өзгертеді. Бұл көптеген аңыздармен қоршалған Қазақстанның ең танымал табиғи көрікті жерлерінің бірі.",
            "image_url": "https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?w=800",
            "vr_url": "https://cdn.pannellum.org/2.5/pannellum.htm#panorama=https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=2000&autoLoad=true",
            "vr_type": "iframe",
            "latitude": 53.0897,
            "longitude": 70.2869,
            "average_rating": 0,
            "review_count": 0
        },
        {
            "id": "burabay_lake",
            "region_id": "burabay",
            "name_ru": "Озеро Бурабай",
            "name_en": "Burabay Lake",
            "name_kz": "Бұрабай көлі",
            "description_ru": "Жемчужина Казахстана - кристально чистое озеро площадью 10 км², окруженное живописными горами и сосновыми лесами. Глубина достигает 6 метров. Вода озера богата минералами и обладает целебными свойствами. Идеальное место для отдыха, купания и рыбалки.",
            "description_en": "Pearl of Kazakhstan - crystal clear lake with an area of 10 km², surrounded by picturesque mountains and pine forests. Depth reaches 6 meters. Lake water is rich in minerals and has healing properties. Perfect place for recreation, swimming and fishing.",
            "description_kz": "Қазақстанның інжу-маржаны - көлемі 10 км² мөлдір таза көл, көрікті таулар мен қарағай ормандарымен қоршалған. Тереңдігі 6 метрге жетеді. Көл суы минералдарға бай және емдік қасиеттерге ие. Демалу, жүзу және балық аулау үшін тамаша жер.",
            "image_url": "https://images.unsplash.com/photo-1761829717820-98dff45b8d9f?crop=entropy&cs=srgb&fm=jpg&ixid=M3w4NjA2ODl8MHwxfHNlYXJjaHwxfHxCdXJhYmF5JTIwTmF0aW9uYWwlMjBQYXJrJTIwS2F6YWtoc3RhbiUyMGxha2UlMjBmb3Jlc3R8ZW58MHx8fHwxNzcxNjA1ODU3fDA&ixlib=rb-4.1.0&q=85",
            "vr_url": "https://cdn.pannellum.org/2.5/pannellum.htm#panorama=https://images.unsplash.com/photo-1439066615861-d1af74d74000?w=2000&autoLoad=true",
            "vr_type": "iframe",
            "latitude": 53.0833,
            "longitude": 70.2833,
            "average_rating": 0,
            "review_count": 0
        },
        {
            "id": "okzhetpes",
            "region_id": "burabay",
            "name_ru": "Гора Окжетпес",
            "name_en": "Okzhetpes Mountain",
            "name_kz": "Оқжетпес тауы",
            "description_ru": "Величественная гора высотой 300 метров с крутыми склонами. Название означает 'не долетит стрела'. По легенде, влюбленные Кобланды и Баян встречались здесь. Со смотровой площадки открывается потрясающий вид на озеро и окружающие леса.",
            "description_en": "Majestic mountain 300 meters high with steep slopes. The name means 'the arrow will not reach'. According to legend, lovers Koblandy and Bayan met here. From the observation deck there is a stunning view of the lake and surrounding forests.",
            "description_kz": "Тік беткейлері бар биіктігі 300 метр салтанатты тау. Аты 'оқ жетпес' дегенді білдіреді. Аңызға сәйкес, ғашықтар Қобланды мен Баян осында кездесіпті. Бақылау алаңынан көлге және айналадағы ормандарға керемет көрініс ашылады.",
            "image_url": "https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=800",
            "vr_url": "https://cdn.pannellum.org/2.5/pannellum.htm#panorama=https://images.unsplash.com/photo-1486870591958-9b9d0d1dda99?w=2000&autoLoad=true",
            "vr_type": "iframe",
            "latitude": 53.0944,
            "longitude": 70.3011,
            "average_rating": 0,
            "review_count": 0
        },
        {
            "id": "charyn_canyon",
            "region_id": "kolsay",
            "name_ru": "Чарынский каньон",
            "name_en": "Charyn Canyon",
            "name_kz": "Шарын шатқалы",
            "description_ru": "Грандиозный каньон протяженностью 154 км и глубиной до 300 метров, который часто сравнивают с Гранд-Каньоном в США. Возраст каньона - 12 миллионов лет. Здесь находится знаменитая Долина Замков с причудливыми скальными образованиями красного цвета.",
            "description_en": "Grand canyon 154 km long and up to 300 meters deep, often compared to the Grand Canyon in the USA. The canyon is 12 million years old. Here is the famous Valley of Castles with bizarre red rock formations.",
            "description_kz": "Ұзындығы 154 км және тереңдігі 300 метрге дейін, жиі АҚШ-тағы Гранд-Каньонмен салыстырылатын грандиозды шатқал. Шатқалдың жасы - 12 миллион жыл. Мұнда қызыл түсті ерекше жартас қалыптасуларымен әйгілі Қамалдар алқабы орналасқан.",
            "image_url": "https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=800",
            "vr_url": "https://cdn.pannellum.org/2.5/pannellum.htm#panorama=https://images.unsplash.com/photo-1473580044384-7ba9967e16a0?w=2000&autoLoad=true",
            "vr_type": "iframe",
            "latitude": 43.3167,
            "longitude": 79.0833,
            "average_rating": 0,
            "review_count": 0
        },
        {
            "id": "kolsay_lakes",
            "region_id": "kolsay",
            "name_ru": "Кольсайские озера",
            "name_en": "Kolsay Lakes",
            "name_kz": "Көлсай көлдері",
            "description_ru": "Система трех высокогорных озер, расположенных на высотах от 1800 до 2800 метров. Первое озеро - самое доступное, второе окружено еловыми лесами, третье находится у снежных вершин. Вода настолько прозрачна, что видимость достигает 10 метров. Называют 'жемчужинами Северного Тянь-Шаня'.",
            "description_en": "System of three alpine lakes located at altitudes from 1800 to 2800 meters. The first lake is the most accessible, the second is surrounded by spruce forests, the third is at snowy peaks. The water is so transparent that visibility reaches 10 meters. Called 'pearls of the Northern Tien Shan'.",
            "description_kz": "1800-ден 2800 метр биіктікте орналасқан үш биік таулы көлдер жүйесі. Бірінші көл - ең қолжетімді, екіншісі шырша ормандарымен қоршалған, үшіншісі қарлы шыңдарда орналасқан. Су соншалықты мөлдір, көрінетіндік 10 метрге жетеді. 'Солтүстік Тянь-Шань інжу-маржандары' деп аталады.",
            "image_url": "https://images.pexels.com/photos/24816020/pexels-photo-24816020.jpeg?auto=compress&cs=tinysrgb&dpr=2&h=650&w=940",
            "vr_url": "https://cdn.pannellum.org/2.5/pannellum.htm#panorama=https://images.unsplash.com/photo-1454496522488-7a8e488e8606?w=2000&autoLoad=true",
            "vr_type": "iframe",
            "latitude": 42.9667,
            "longitude": 78.3333,
            "average_rating": 0,
            "review_count": 0
        },
        {
            "id": "kaindy_lake",
            "region_id": "kolsay",
            "name_ru": "Озеро Каинды",
            "name_en": "Kaindy Lake",
            "name_kz": "Қайыңды көлі",
            "description_ru": "Уникальное озеро с затопленным еловым лесом, образовавшееся после землетрясения 1911 года. Стволы деревьев возвышаются над водой, создавая сюрреалистический пейзаж. Вода имеет необычный бирюзовый цвет. Глубина достигает 30 метров, температура воды не превышает 6°C даже летом.",
            "description_en": "Unique lake with a submerged spruce forest, formed after the 1911 earthquake. Tree trunks rise above the water, creating a surreal landscape. The water has an unusual turquoise color. Depth reaches 30 meters, water temperature does not exceed 6°C even in summer.",
            "description_kz": "1911 жылғы жер сілкінісінен кейін пайда болған су астында қалған шырша орманы бар бірегей көл. Ағаш діңгектері судан биік көтеріліп, сюрреалистік пейзаж жасайды. Судың түсі ерекше көгілдір. Тереңдігі 30 метрге жетеді, судың температурасы жазда да 6°C-тан аспайды.",
            "image_url": "https://images.unsplash.com/photo-1439066615861-d1af74d74000?w=800",
            "vr_url": "https://cdn.pannellum.org/2.5/pannellum.htm#panorama=https://images.unsplash.com/photo-1433086966358-54859d0ed716?w=2000&autoLoad=true",
            "vr_type": "iframe",
            "latitude": 42.9833,
            "longitude": 78.4833,
            "average_rating": 0,
            "review_count": 0
        },
        {
            "id": "caspian_beach",
            "region_id": "caspian",
            "name_ru": "Пляж Актау",
            "name_en": "Aktau Beach",
            "name_kz": "Ақтау жағажайы",
            "description_ru": "Протяженные песчаные пляжи на берегу Каспийского моря с чистым золотистым песком. Идеальное место для пляжного отдыха, купания и водных видов спорта. Средняя температура воды летом достигает 25-28°C. Вдоль побережья расположены современные курорты.",
            "description_en": "Long sandy beaches on the coast of the Caspian Sea with clean golden sand. Ideal place for beach holidays, swimming and water sports. Average summer water temperature reaches 25-28°C. Modern resorts are located along the coast.",
            "description_kz": "Таза алтын құммен Каспий теңізі жағалауындағы ұзын құмды жағажайлар. Жағажайда демалу, жүзу және су спорт түрлері үшін тамаша жер. Жазда судың орташа температурасы 25-28°C-қа жетеді. Жағалау бойында заманауи курорттар орналасқан.",
            "image_url": "https://images.pexels.com/photos/20591591/pexels-photo-20591591.jpeg?auto=compress&cs=tinysrgb&dpr=2&h=650&w=940",
            "vr_url": "https://cdn.pannellum.org/2.5/pannellum.htm#panorama=https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=2000&autoLoad=true",
            "vr_type": "iframe",
            "latitude": 43.6532,
            "longitude": 51.1694,
            "average_rating": 0,
            "review_count": 0
        }
    ]
    
    await db.attractions.insert_many(attractions)

async def init_hotels():
    hotels = [
        {
            "id": "hotel_1",
            "region_id": "burabay",
            "name": "Eco Resort Burabay",
            "description": "Эко-отель с видом на озеро",
            "price_per_night": 15000,
            "is_partner": True,
            "image_url": "https://images.pexels.com/photos/14106949/pexels-photo-14106949.jpeg?auto=compress&cs=tinysrgb&dpr=2&h=650&w=940",
            "rating": 4.7
        },
        {
            "id": "hotel_2",
            "region_id": "caspian",
            "name": "Caspian Eco Lodge",
            "description": "Современный эко-отель на берегу моря",
            "price_per_night": 20000,
            "is_partner": True,
            "image_url": "https://images.pexels.com/photos/14106949/pexels-photo-14106949.jpeg?auto=compress&cs=tinysrgb&dpr=2&h=650&w=940",
            "rating": 4.5
        },
        {
            "id": "hotel_3",
            "region_id": "kolsay",
            "name": "Mountain Eco Camp",
            "description": "Эко-кемпинг в горах",
            "price_per_night": 10000,
            "is_partner": False,
            "image_url": "https://images.pexels.com/photos/14106949/pexels-photo-14106949.jpeg?auto=compress&cs=tinysrgb&dpr=2&h=650&w=940",
            "rating": 4.3
        }
    ]
    await db.hotels.insert_many(hotels)

async def init_tasks():
    tasks = [
        {
            "id": "task_recycle",
            "title_ru": "Сортировка мусора",
            "title_en": "Waste Sorting",
            "title_kz": "Қоқысты сұрыптау",
            "description_ru": "Сфотографируйте как вы сортируете отходы",
            "description_en": "Take a photo of you sorting waste",
            "description_kz": "Қалдықтарды сұрыптап жатқаныңызды суретке түсіріңіз",
            "reward_coins": 50,
            "type": "recycling",
            "image_required": True
        },
        {
            "id": "task_cleanup",
            "title_ru": "Уборка территории",
            "title_en": "Area Cleanup",
            "title_kz": "Аумақты тазалау",
            "description_ru": "Снимите на видео как вы убираете мусор на улице",
            "description_en": "Record a video of you cleaning up litter",
            "description_kz": "Көшеде қоқысты жинап жатқаныңызды бейнеге түсіріңіз",
            "reward_coins": 100,
            "type": "cleanup",
            "image_required": True
        },
        {
            "id": "task_visit",
            "title_ru": "Посещение достопримечательности",
            "title_en": "Visit Attraction",
            "title_kz": "Көрікті жерге бару",
            "description_ru": "Сделайте селфи на фоне природной достопримечательности",
            "description_en": "Take a selfie at a natural attraction",
            "description_kz": "Табиғи көрікті жерде селфи түсіріңіз",
            "reward_coins": 30,
            "type": "visit",
            "image_required": True
        },
        {
            "id": "task_bin",
            "title_ru": "Использование эко-контейнера",
            "title_en": "Use Eco Bin",
            "title_kz": "Эко-контейнерді пайдалану",
            "description_ru": "Сфотографируйте как выбрасываете мусор в специальный бак",
            "description_en": "Photo of you throwing trash in a special eco bin",
            "description_kz": "Қоқысты арнайы бакқа тастап жатқаныңызды суретке түсіріңіз",
            "reward_coins": 40,
            "type": "disposal",
            "image_required": True
        }
    ]
    await db.tasks.insert_many(tasks)

async def init_charging_stations():
    stations = [
        {
            "id": "station_1",
            "name": "Актау Центр",
            "latitude": 43.6532,
            "longitude": 51.1694,
            "availability": True
        },
        {
            "id": "station_2",
            "name": "Бурабай Парк",
            "latitude": 53.0833,
            "longitude": 70.2833,
            "availability": True
        },
        {
            "id": "station_3",
            "name": "Алматы Южная",
            "latitude": 43.2220,
            "longitude": 76.8512,
            "availability": True
        }
    ]
    await db.charging_stations.insert_many(stations)

app.include_router(api_router)

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=os.environ.get('CORS_ORIGINS', '*').split(','),
    allow_methods=["*"],
    allow_headers=["*"],
)

logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()