from pydantic import BaseModel, Field, EmailStr, ConfigDict
from typing import Optional, List, Literal
from datetime import datetime
import uuid

class UserRegister(BaseModel):
    email: EmailStr
    password: str
    name: str
    role: Literal["tourist", "taxi_driver", "admin"]

class UserLogin(BaseModel):
    email: EmailStr
    password: str

class User(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    email: EmailStr
    name: str
    role: str
    ecocoin_balance: int = 0
    created_at: str

class Region(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str
    name_ru: str
    name_en: str
    name_kz: str
    description_ru: str
    description_en: str
    description_kz: str
    image_url: str

class Attraction(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    region_id: str
    name_ru: str
    name_en: str
    name_kz: str
    description_ru: str
    description_en: str
    description_kz: str
    image_url: str
    vr_url: Optional[str] = None
    vr_type: Optional[str] = "equirectangular"
    latitude: float
    longitude: float
    average_rating: float = 0.0
    review_count: int = 0

class Review(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    attraction_id: str
    user_id: str
    user_name: str
    rating: int
    comment: str
    status: str = "pending"
    created_at: str

class ReviewCreate(BaseModel):
    attraction_id: str
    rating: int
    comment: str

class Hotel(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    region_id: str
    name: str
    description: str
    price_per_night: int
    is_partner: bool = False
    image_url: str
    rating: float = 4.5

class TaxiOrder(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    user_id: str
    driver_id: Optional[str] = None
    from_location: str
    to_location: str
    from_lat: float
    from_lng: float
    to_lat: float
    to_lng: float
    status: str = "pending"
    created_at: str

class TaxiOrderCreate(BaseModel):
    from_location: str
    to_location: str
    from_lat: float
    from_lng: float
    to_lat: float
    to_lng: float

class Task(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    title_ru: str
    title_en: str
    title_kz: str
    description_ru: str
    description_en: str
    description_kz: str
    reward_coins: int
    type: str
    image_required: bool = True

class TaskSubmission(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    user_id: str
    task_id: str
    image_base64: str
    status: str = "pending"
    verified_at: Optional[str] = None
    created_at: str

class TaskSubmissionCreate(BaseModel):
    task_id: str
    image_base64: str

class EcocoinTransaction(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    user_id: str
    amount: int
    type: str
    description: str
    created_at: str

class ChargingStation(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    name: str
    latitude: float
    longitude: float
    availability: bool = True

class AIMessage(BaseModel):
    message: str
    image_base64: Optional[str] = None
    language: str = "ru"