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
from emergentintegrations.llm.chat import LlmChat, UserMessage

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

# LLM Configuration
EMERGENT_LLM_KEY = os.environ.get('EMERGENT_LLM_KEY')

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
analytics_router = APIRouter(prefix="/analytics", tags=["Analytics"])
chat_router = APIRouter(prefix="/chat", tags=["AI Chat"])

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
    is_sold: Optional[bool] = None
    
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
    is_sold: bool = False
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

class ChatMessage(BaseModel):
    message: str

class ChatResponse(BaseModel):
    response: str
    timestamp: str

class AnalyticsOverview(BaseModel):
    total_listings: int
    active_listings: int
    sold_items: int
    total_revenue: float
    wishlist_count: int

class CategoryDistribution(BaseModel):
    category: str
    count: int
    revenue: float

class MonthlySales(BaseModel):
    month: str
    listings: int
    sold: int
    revenue: float

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
    existing_user = await db.users.find_one({"email": user.email})
    if existing_user:
        raise HTTPException(status_code=400, detail="Email already registered")
    
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
    access_token = create_access_token({"sub": user_id})
    
    return TokenResponse(
        access_token=access_token,
        user=UserResponse(id=user_id, email=user.email, name=user.name, created_at=now)
    )

@auth_router.post("/login", response_model=TokenResponse)
async def login(credentials: UserLogin):
    user = await db.users.find_one({"email": credentials.email})
    if not user or not verify_password(credentials.password, user["password"]):
        raise HTTPException(status_code=401, detail="Invalid email or password")
    
    access_token = create_access_token({"sub": user["id"]})
    
    return TokenResponse(
        access_token=access_token,
        user=UserResponse(id=user["id"], email=user["email"], name=user["name"], created_at=user["created_at"])
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
        "is_sold": False,
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
    max_price: Optional[float] = None,
    exclude_sold: bool = False
):
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
    
    if exclude_sold:
        query["is_sold"] = False
    
    total = await db.products.count_documents(query)
    skip = (page - 1) * limit
    pages = (total + limit - 1) // limit if total > 0 else 1
    
    products = await db.products.find(query, {"_id": 0}).sort("created_at", -1).skip(skip).limit(limit).to_list(limit)
    
    # Add default is_sold field for older products
    for p in products:
        if "is_sold" not in p:
            p["is_sold"] = False
    
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
    if "is_sold" not in product:
        product["is_sold"] = False
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
    if "is_sold" not in updated_product:
        updated_product["is_sold"] = False
    return ProductResponse(**updated_product)

@products_router.post("/{product_id}/mark-sold")
async def mark_product_sold(product_id: str, current_user: dict = Depends(get_current_user)):
    product = await db.products.find_one({"id": product_id}, {"_id": 0})
    if not product:
        raise HTTPException(status_code=404, detail="Product not found")
    
    if product["seller_id"] != current_user["id"]:
        raise HTTPException(status_code=403, detail="You can only mark your own products as sold")
    
    await db.products.update_one(
        {"id": product_id}, 
        {"$set": {"is_sold": True, "sold_at": datetime.now(timezone.utc).isoformat()}}
    )
    return {"message": "Product marked as sold"}

@products_router.delete("/{product_id}")
async def delete_product(product_id: str, current_user: dict = Depends(get_current_user)):
    product = await db.products.find_one({"id": product_id}, {"_id": 0})
    if not product:
        raise HTTPException(status_code=404, detail="Product not found")
    
    if product["seller_id"] != current_user["id"]:
        raise HTTPException(status_code=403, detail="You can only delete your own products")
    
    await db.products.delete_one({"id": product_id})
    await db.wishlist.delete_many({"product_id": product_id})
    
    return {"message": "Product deleted successfully"}

@products_router.get("/user/{user_id}", response_model=List[ProductResponse])
async def get_user_products(user_id: str):
    products = await db.products.find({"seller_id": user_id}, {"_id": 0}).sort("created_at", -1).to_list(100)
    for p in products:
        if "is_sold" not in p:
            p["is_sold"] = False
    return [ProductResponse(**p) for p in products]

# ==================== WISHLIST ROUTES ====================

@wishlist_router.get("", response_model=List[ProductResponse])
async def get_wishlist(current_user: dict = Depends(get_current_user)):
    wishlist_items = await db.wishlist.find({"user_id": current_user["id"]}, {"_id": 0}).to_list(100)
    product_ids = [item["product_id"] for item in wishlist_items]
    
    if not product_ids:
        return []
    
    products = await db.products.find({"id": {"$in": product_ids}}, {"_id": 0}).to_list(100)
    for p in products:
        if "is_sold" not in p:
            p["is_sold"] = False
    return [ProductResponse(**p) for p in products]

@wishlist_router.post("/{product_id}")
async def add_to_wishlist(product_id: str, current_user: dict = Depends(get_current_user)):
    product = await db.products.find_one({"id": product_id})
    if not product:
        raise HTTPException(status_code=404, detail="Product not found")
    
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
    await db.products.update_many({"seller_id": current_user["id"]}, {"$set": {"seller_name": name}})
    
    updated_user = await db.users.find_one({"id": current_user["id"]}, {"_id": 0, "password": 0})
    return UserResponse(**updated_user)

# ==================== ANALYTICS ROUTES ====================

@analytics_router.get("/overview", response_model=AnalyticsOverview)
async def get_analytics_overview(current_user: dict = Depends(get_current_user)):
    user_id = current_user["id"]
    
    # Get all user's products
    all_products = await db.products.find({"seller_id": user_id}, {"_id": 0}).to_list(1000)
    
    total_listings = len(all_products)
    sold_items = sum(1 for p in all_products if p.get("is_sold", False))
    active_listings = total_listings - sold_items
    total_revenue = sum(p["price"] for p in all_products if p.get("is_sold", False))
    
    # Count wishlist items for user's products
    product_ids = [p["id"] for p in all_products]
    wishlist_count = await db.wishlist.count_documents({"product_id": {"$in": product_ids}}) if product_ids else 0
    
    return AnalyticsOverview(
        total_listings=total_listings,
        active_listings=active_listings,
        sold_items=sold_items,
        total_revenue=total_revenue,
        wishlist_count=wishlist_count
    )

@analytics_router.get("/category-distribution", response_model=List[CategoryDistribution])
async def get_category_distribution(current_user: dict = Depends(get_current_user)):
    user_id = current_user["id"]
    
    pipeline = [
        {"$match": {"seller_id": user_id}},
        {"$group": {
            "_id": "$category",
            "count": {"$sum": 1},
            "revenue": {"$sum": {"$cond": [{"$eq": ["$is_sold", True]}, "$price", 0]}}
        }},
        {"$sort": {"count": -1}}
    ]
    
    results = await db.products.aggregate(pipeline).to_list(100)
    
    return [
        CategoryDistribution(category=r["_id"], count=r["count"], revenue=r["revenue"])
        for r in results
    ]

@analytics_router.get("/monthly-sales", response_model=List[MonthlySales])
async def get_monthly_sales(current_user: dict = Depends(get_current_user)):
    user_id = current_user["id"]
    
    # Get last 6 months of data
    now = datetime.now(timezone.utc)
    months_data = []
    
    for i in range(5, -1, -1):
        month_start = (now.replace(day=1) - timedelta(days=i*30)).replace(day=1)
        if i > 0:
            month_end = (month_start.replace(day=28) + timedelta(days=4)).replace(day=1)
        else:
            month_end = now
        
        month_name = month_start.strftime("%b %Y")
        
        # Count listings created in this month
        listings = await db.products.count_documents({
            "seller_id": user_id,
            "created_at": {
                "$gte": month_start.isoformat(),
                "$lt": month_end.isoformat()
            }
        })
        
        # Count sold items and revenue
        sold_products = await db.products.find({
            "seller_id": user_id,
            "is_sold": True,
            "sold_at": {
                "$gte": month_start.isoformat(),
                "$lt": month_end.isoformat()
            }
        }, {"_id": 0, "price": 1}).to_list(1000)
        
        sold = len(sold_products)
        revenue = sum(p["price"] for p in sold_products)
        
        months_data.append(MonthlySales(
            month=month_name,
            listings=listings,
            sold=sold,
            revenue=revenue
        ))
    
    return months_data

@analytics_router.get("/top-products")
async def get_top_products(current_user: dict = Depends(get_current_user)):
    user_id = current_user["id"]
    
    # Get products with most wishlist counts
    products = await db.products.find({"seller_id": user_id}, {"_id": 0}).to_list(100)
    
    product_stats = []
    for p in products:
        wishlist_count = await db.wishlist.count_documents({"product_id": p["id"]})
        product_stats.append({
            "id": p["id"],
            "name": p["name"],
            "price": p["price"],
            "category": p["category"],
            "wishlist_count": wishlist_count,
            "is_sold": p.get("is_sold", False)
        })
    
    # Sort by wishlist count
    product_stats.sort(key=lambda x: x["wishlist_count"], reverse=True)
    
    return product_stats[:5]

# ==================== AI CHAT ROUTES ====================

@chat_router.post("", response_model=ChatResponse)
async def chat_with_ai(message: ChatMessage, current_user: dict = Depends(get_current_user)):
    user_id = current_user["id"]
    user_name = current_user["name"]
    
    # Get user's analytics for context
    all_products = await db.products.find({"seller_id": user_id}, {"_id": 0}).to_list(100)
    total_listings = len(all_products)
    sold_items = sum(1 for p in all_products if p.get("is_sold", False))
    total_revenue = sum(p["price"] for p in all_products if p.get("is_sold", False))
    
    # Category breakdown
    category_counts = {}
    for p in all_products:
        cat = p["category"]
        if cat not in category_counts:
            category_counts[cat] = {"count": 0, "sold": 0, "revenue": 0}
        category_counts[cat]["count"] += 1
        if p.get("is_sold", False):
            category_counts[cat]["sold"] += 1
            category_counts[cat]["revenue"] += p["price"]
    
    # Build context for AI
    context = f"""You are an AI assistant for MUJ Campus Marketplace, helping seller {user_name}.

SELLER'S CURRENT STATS:
- Total Listings: {total_listings}
- Items Sold: {sold_items}
- Active Listings: {total_listings - sold_items}
- Total Revenue: ₹{total_revenue:,.0f}

CATEGORY BREAKDOWN:
{chr(10).join([f"- {cat}: {data['count']} listed, {data['sold']} sold, ₹{data['revenue']:,.0f} revenue" for cat, data in category_counts.items()]) if category_counts else "No listings yet"}

RECENT PRODUCTS:
{chr(10).join([f"- {p['name']} (₹{p['price']:,.0f}, {p['category']}, {'SOLD' if p.get('is_sold') else 'Active'})" for p in all_products[:5]]) if all_products else "No products listed yet"}

MARKETPLACE CATEGORIES:
- Room Essentials (Mattress, Table, Chair, Lamp, Fan, Mirror, Curtains)
- Books & Study Material (Engineering books, notes, calculators)
- Electronics (Laptop, Monitor, Keyboard, Mouse, Earphones, Phone)
- Other Useful Stuff (Cycles, Bags, Water Bottles, Extension Boards)

PRICING GUIDELINES (based on condition):
- New: 70-90% of original price
- Like New: 50-70% of original price
- Used: 30-50% of original price

Help the user with:
1. Listing suggestions and pricing
2. Understanding their sales performance
3. Tips to sell items faster
4. Answering marketplace queries

Be helpful, friendly, and specific. Use the seller's actual data when answering questions."""

    try:
        chat = LlmChat(
            api_key=EMERGENT_LLM_KEY,
            session_id=f"muj-marketplace-{user_id}",
            system_message=context
        ).with_model("gemini", "gemini-3-flash-preview")
        
        user_message = UserMessage(text=message.message)
        response = await chat.send_message(user_message)
        
        # Store chat message in database
        chat_doc = {
            "id": str(uuid.uuid4()),
            "user_id": user_id,
            "user_message": message.message,
            "ai_response": response,
            "created_at": datetime.now(timezone.utc).isoformat()
        }
        await db.chat_history.insert_one(chat_doc)
        
        return ChatResponse(
            response=response,
            timestamp=datetime.now(timezone.utc).isoformat()
        )
    except Exception as e:
        logger.error(f"AI Chat error: {str(e)}")
        raise HTTPException(status_code=500, detail=f"AI service error: {str(e)}")

@chat_router.get("/history")
async def get_chat_history(limit: int = Query(20, ge=1, le=100), current_user: dict = Depends(get_current_user)):
    history = await db.chat_history.find(
        {"user_id": current_user["id"]}, 
        {"_id": 0}
    ).sort("created_at", -1).limit(limit).to_list(limit)
    
    return list(reversed(history))

# ==================== CLOUDINARY ROUTES ====================

@cloudinary_router.get("/signature", response_model=CloudinarySignature)
async def generate_signature(
    folder: str = "muj_marketplace",
    current_user: dict = Depends(get_current_user)
):
    timestamp = int(time.time())
    params = {"timestamp": timestamp, "folder": folder}
    
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
api_router.include_router(analytics_router)
api_router.include_router(chat_router)

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
