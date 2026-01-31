from fastapi import FastAPI, APIRouter, HTTPException, Depends, Query, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import logging
from pathlib import Path
from pydantic import BaseModel, Field, ConfigDict, EmailStr, validator
from typing import List, Optional
import uuid
from datetime import datetime, timezone, timedelta
import bcrypt
from jose import JWTError, jwt
import cloudinary
import cloudinary.utils
import time
import re

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

# MongoDB connection
mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

# JWT Configuration
JWT_SECRET = os.environ.get('JWT_SECRET', 'default_secret_change_in_production')
JWT_ALGORITHM = os.environ.get('JWT_ALGORITHM', 'HS256')
JWT_EXPIRATION_HOURS = int(os.environ.get('JWT_EXPIRATION_HOURS', 24))

# Cloudinary Configuration
cloudinary.config(
    cloud_name=os.environ.get("CLOUDINARY_CLOUD_NAME"),
    api_key=os.environ.get("CLOUDINARY_API_KEY"),
    api_secret=os.environ.get("CLOUDINARY_API_SECRET"),
    secure=True
)

# Create the main app
app = FastAPI(title="MUJ Campus Marketplace API")

# Create routers
api_router = APIRouter(prefix="/api")
auth_router = APIRouter(prefix="/auth", tags=["Authentication"])
products_router = APIRouter(prefix="/products", tags=["Products"])
wishlist_router = APIRouter(prefix="/wishlist", tags=["Wishlist"])
users_router = APIRouter(prefix="/users", tags=["Users"])
cloudinary_router = APIRouter(prefix="/cloudinary", tags=["Cloudinary"])

# Security
security = HTTPBearer()

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

# ==================== CONSTANTS ====================
ALLOWED_CATEGORIES = [
    "Room Essentials",
    "Books & Study Material",
    "Electronics",
    "Other Useful Stuff"
]

ALLOWED_CONDITIONS = ["New", "Like New", "Used"]

MUJ_EMAIL_DOMAIN = "@muj.manipal.edu"

# ==================== MODELS ====================

class UserBase(BaseModel):
    email: EmailStr
    name: str

class UserCreate(UserBase):
    password: str
    
    @validator('email')
    def validate_muj_email(cls, v):
        if not v.endswith(MUJ_EMAIL_DOMAIN):
            raise ValueError(f'Email must be a valid MUJ email ending with {MUJ_EMAIL_DOMAIN}')
        return v
    
    @validator('password')
    def validate_password(cls, v):
        if len(v) < 6:
            raise ValueError('Password must be at least 6 characters')
        return v

class UserLogin(BaseModel):
    email: EmailStr
    password: str

class UserResponse(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str
    email: str
    name: str
    created_at: str

class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: UserResponse

class ProductBase(BaseModel):
    name: str
    category: str
    price: float
    condition: str
    description: str
    images: List[str] = []
    
    @validator('category')
    def validate_category(cls, v):
        if v not in ALLOWED_CATEGORIES:
            raise ValueError(f'Category must be one of: {", ".join(ALLOWED_CATEGORIES)}')
        return v
    
    @validator('condition')
    def validate_condition(cls, v):
        if v not in ALLOWED_CONDITIONS:
            raise ValueError(f'Condition must be one of: {", ".join(ALLOWED_CONDITIONS)}')
        return v
    
    @validator('price')
    def validate_price(cls, v):
        if v <= 0:
            raise ValueError('Price must be greater than 0')
        return v
    
    @validator('images')
    def validate_images(cls, v):
        if len(v) == 0:
            raise ValueError('At least one image is required')
        return v

class ProductCreate(ProductBase):
    pass

class ProductUpdate(BaseModel):
    name: Optional[str] = None
    category: Optional[str] = None
    price: Optional[float] = None
    condition: Optional[str] = None
    description: Optional[str] = None
    images: Optional[List[str]] = None
    
    @validator('category')
    def validate_category(cls, v):
        if v is not None and v not in ALLOWED_CATEGORIES:
            raise ValueError(f'Category must be one of: {", ".join(ALLOWED_CATEGORIES)}')
        return v
    
    @validator('condition')
    def validate_condition(cls, v):
        if v is not None and v not in ALLOWED_CONDITIONS:
            raise ValueError(f'Condition must be one of: {", ".join(ALLOWED_CONDITIONS)}')
        return v

class ProductResponse(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str
    name: str
    category: str
    price: float
    condition: str
    description: str
    images: List[str]
    seller_id: str
    seller_name: str
    seller_email: str
    created_at: str
    updated_at: str

class WishlistItem(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str
    user_id: str
    product_id: str
    created_at: str

class PaginatedProducts(BaseModel):
    products: List[ProductResponse]
    total: int
    page: int
    pages: int

class CloudinarySignature(BaseModel):
    signature: str
    timestamp: int
    cloud_name: str
    api_key: str
    folder: str

# ==================== AUTH HELPERS ====================

def hash_password(password: str) -> str:
    return bcrypt.hashpw(password.encode('utf-8'), bcrypt.gensalt()).decode('utf-8')

def verify_password(password: str, hashed: str) -> bool:
    return bcrypt.checkpw(password.encode('utf-8'), hashed.encode('utf-8'))

def create_access_token(data: dict) -> str:
    to_encode = data.copy()
    expire = datetime.now(timezone.utc) + timedelta(hours=JWT_EXPIRATION_HOURS)
    to_encode.update({"exp": expire})
    return jwt.encode(to_encode, JWT_SECRET, algorithm=JWT_ALGORITHM)

async def get_current_user(credentials: HTTPAuthorizationCredentials = Depends(security)) -> dict:
    try:
        token = credentials.credentials
        payload = jwt.decode(token, JWT_SECRET, algorithms=[JWT_ALGORITHM])
        user_id = payload.get("sub")
        if user_id is None:
            raise HTTPException(status_code=401, detail="Invalid token")
        
        user = await db.users.find_one({"id": user_id}, {"_id": 0, "password": 0})
        if user is None:
            raise HTTPException(status_code=401, detail="User not found")
        return user
    except JWTError:
        raise HTTPException(status_code=401, detail="Invalid token")

# ==================== AUTH ROUTES ====================

@auth_router.post("/register", response_model=TokenResponse)
async def register(user: UserCreate):
    # Check if user already exists
    existing_user = await db.users.find_one({"email": user.email})
    if existing_user:
        raise HTTPException(status_code=400, detail="Email already registered")
    
    # Create user
    user_id = str(uuid.uuid4())
    now = datetime.now(timezone.utc).isoformat()
    
    user_doc = {
        "id": user_id,
        "email": user.email,
        "name": user.name,
        "password": hash_password(user.password),
        "created_at": now
    }
    
    await db.users.insert_one(user_doc)
    
    # Create token
    access_token = create_access_token({"sub": user_id})
    
    return TokenResponse(
        access_token=access_token,
        user=UserResponse(
            id=user_id,
            email=user.email,
            name=user.name,
            created_at=now
        )
    )

@auth_router.post("/login", response_model=TokenResponse)
async def login(credentials: UserLogin):
    user = await db.users.find_one({"email": credentials.email})
    if not user or not verify_password(credentials.password, user["password"]):
        raise HTTPException(status_code=401, detail="Invalid email or password")
    
    access_token = create_access_token({"sub": user["id"]})
    
    return TokenResponse(
        access_token=access_token,
        user=UserResponse(
            id=user["id"],
            email=user["email"],
            name=user["name"],
            created_at=user["created_at"]
        )
    )

@auth_router.get("/me", response_model=UserResponse)
async def get_me(current_user: dict = Depends(get_current_user)):
    return UserResponse(
        id=current_user["id"],
        email=current_user["email"],
        name=current_user["name"],
        created_at=current_user["created_at"]
    )

# ==================== PRODUCT ROUTES ====================

@products_router.post("", response_model=ProductResponse)
async def create_product(product: ProductCreate, current_user: dict = Depends(get_current_user)):
    product_id = str(uuid.uuid4())
    now = datetime.now(timezone.utc).isoformat()
    
    product_doc = {
        "id": product_id,
        "name": product.name,
        "category": product.category,
        "price": product.price,
        "condition": product.condition,
        "description": product.description,
        "images": product.images,
        "seller_id": current_user["id"],
        "seller_name": current_user["name"],
        "seller_email": current_user["email"],
        "created_at": now,
        "updated_at": now
    }
    
    await db.products.insert_one(product_doc)
    
    return ProductResponse(**product_doc)

@products_router.get("", response_model=PaginatedProducts)
async def get_products(
    page: int = Query(1, ge=1),
    limit: int = Query(12, ge=1, le=50),
    category: Optional[str] = None,
    search: Optional[str] = None,
    condition: Optional[str] = None,
    min_price: Optional[float] = None,
    max_price: Optional[float] = None
):
    # Build query
    query = {}
    
    if category:
        query["category"] = category
    
    if condition:
        query["condition"] = condition
    
    if search:
        query["$or"] = [
            {"name": {"$regex": search, "$options": "i"}},
            {"description": {"$regex": search, "$options": "i"}}
        ]
    
    if min_price is not None or max_price is not None:
        query["price"] = {}
        if min_price is not None:
            query["price"]["$gte"] = min_price
        if max_price is not None:
            query["price"]["$lte"] = max_price
        if not query["price"]:
            del query["price"]
    
    # Count total
    total = await db.products.count_documents(query)
    
    # Calculate pagination
    skip = (page - 1) * limit
    pages = (total + limit - 1) // limit if total > 0 else 1
    
    # Get products
    products = await db.products.find(query, {"_id": 0}).sort("created_at", -1).skip(skip).limit(limit).to_list(limit)
    
    return PaginatedProducts(
        products=[ProductResponse(**p) for p in products],
        total=total,
        page=page,
        pages=pages
    )

@products_router.get("/categories")
async def get_categories():
    return {"categories": ALLOWED_CATEGORIES}

@products_router.get("/conditions")
async def get_conditions():
    return {"conditions": ALLOWED_CONDITIONS}

@products_router.get("/{product_id}", response_model=ProductResponse)
async def get_product(product_id: str):
    product = await db.products.find_one({"id": product_id}, {"_id": 0})
    if not product:
        raise HTTPException(status_code=404, detail="Product not found")
    return ProductResponse(**product)

@products_router.put("/{product_id}", response_model=ProductResponse)
async def update_product(product_id: str, update: ProductUpdate, current_user: dict = Depends(get_current_user)):
    product = await db.products.find_one({"id": product_id}, {"_id": 0})
    if not product:
        raise HTTPException(status_code=404, detail="Product not found")
    
    if product["seller_id"] != current_user["id"]:
        raise HTTPException(status_code=403, detail="You can only edit your own products")
    
    update_data = {k: v for k, v in update.model_dump().items() if v is not None}
    
    if update_data:
        update_data["updated_at"] = datetime.now(timezone.utc).isoformat()
        await db.products.update_one({"id": product_id}, {"$set": update_data})
    
    updated_product = await db.products.find_one({"id": product_id}, {"_id": 0})
    return ProductResponse(**updated_product)

@products_router.delete("/{product_id}")
async def delete_product(product_id: str, current_user: dict = Depends(get_current_user)):
    product = await db.products.find_one({"id": product_id}, {"_id": 0})
    if not product:
        raise HTTPException(status_code=404, detail="Product not found")
    
    if product["seller_id"] != current_user["id"]:
        raise HTTPException(status_code=403, detail="You can only delete your own products")
    
    await db.products.delete_one({"id": product_id})
    # Also remove from all wishlists
    await db.wishlist.delete_many({"product_id": product_id})
    
    return {"message": "Product deleted successfully"}

@products_router.get("/user/{user_id}", response_model=List[ProductResponse])
async def get_user_products(user_id: str):
    products = await db.products.find({"seller_id": user_id}, {"_id": 0}).sort("created_at", -1).to_list(100)
    return [ProductResponse(**p) for p in products]

# ==================== WISHLIST ROUTES ====================

@wishlist_router.get("", response_model=List[ProductResponse])
async def get_wishlist(current_user: dict = Depends(get_current_user)):
    wishlist_items = await db.wishlist.find({"user_id": current_user["id"]}, {"_id": 0}).to_list(100)
    product_ids = [item["product_id"] for item in wishlist_items]
    
    if not product_ids:
        return []
    
    products = await db.products.find({"id": {"$in": product_ids}}, {"_id": 0}).to_list(100)
    return [ProductResponse(**p) for p in products]

@wishlist_router.post("/{product_id}")
async def add_to_wishlist(product_id: str, current_user: dict = Depends(get_current_user)):
    # Check if product exists
    product = await db.products.find_one({"id": product_id})
    if not product:
        raise HTTPException(status_code=404, detail="Product not found")
    
    # Check if already in wishlist
    existing = await db.wishlist.find_one({"user_id": current_user["id"], "product_id": product_id})
    if existing:
        raise HTTPException(status_code=400, detail="Product already in wishlist")
    
    wishlist_item = {
        "id": str(uuid.uuid4()),
        "user_id": current_user["id"],
        "product_id": product_id,
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    
    await db.wishlist.insert_one(wishlist_item)
    return {"message": "Added to wishlist"}

@wishlist_router.delete("/{product_id}")
async def remove_from_wishlist(product_id: str, current_user: dict = Depends(get_current_user)):
    result = await db.wishlist.delete_one({"user_id": current_user["id"], "product_id": product_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Product not in wishlist")
    return {"message": "Removed from wishlist"}

@wishlist_router.get("/check/{product_id}")
async def check_wishlist(product_id: str, current_user: dict = Depends(get_current_user)):
    existing = await db.wishlist.find_one({"user_id": current_user["id"], "product_id": product_id})
    return {"in_wishlist": existing is not None}

# ==================== USER ROUTES ====================

@users_router.put("/profile", response_model=UserResponse)
async def update_profile(name: str = Query(..., min_length=1), current_user: dict = Depends(get_current_user)):
    await db.users.update_one({"id": current_user["id"]}, {"$set": {"name": name}})
    
    # Also update seller_name in all products
    await db.products.update_many({"seller_id": current_user["id"]}, {"$set": {"seller_name": name}})
    
    updated_user = await db.users.find_one({"id": current_user["id"]}, {"_id": 0, "password": 0})
    return UserResponse(**updated_user)

# ==================== CLOUDINARY ROUTES ====================

@cloudinary_router.get("/signature", response_model=CloudinarySignature)
async def generate_signature(
    folder: str = "muj_marketplace",
    current_user: dict = Depends(get_current_user)
):
    timestamp = int(time.time())
    params = {
        "timestamp": timestamp,
        "folder": folder
    }
    
    signature = cloudinary.utils.api_sign_request(
        params,
        os.environ.get("CLOUDINARY_API_SECRET")
    )
    
    return CloudinarySignature(
        signature=signature,
        timestamp=timestamp,
        cloud_name=os.environ.get("CLOUDINARY_CLOUD_NAME"),
        api_key=os.environ.get("CLOUDINARY_API_KEY"),
        folder=folder
    )

# ==================== ROOT ROUTES ====================

@api_router.get("/")
async def root():
    return {"message": "MUJ Campus Marketplace API", "version": "1.0.0"}

@api_router.get("/health")
async def health_check():
    return {"status": "healthy"}

# Include all routers
api_router.include_router(auth_router)
api_router.include_router(products_router)
api_router.include_router(wishlist_router)
api_router.include_router(users_router)
api_router.include_router(cloudinary_router)

app.include_router(api_router)

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=os.environ.get('CORS_ORIGINS', '*').split(','),
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()
