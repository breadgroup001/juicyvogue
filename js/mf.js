const body = document.querySelector("body"),
      nav = document.querySelector("nav"),
      sidebarOpen = document.querySelector(".sidebarOpen"),
      sbClose = document.querySelector(".sbClose");

      sidebarOpen.addEventListener("click", () => {
      nav.classList.add("active");
    }
);

body.addEventListener("click", e => {
    let clickedElm = e.target;
    if(!clickedElm.classList.contains("sidebarOpen") && !clickedElm.classList.contains("menu")){
        nav.classList.remove("active");
    }
});

// ==========================================
//         AIRTABLE & PAYSTACK CONFIG
// ==========================================
const AIRTABLE_TOKEN = 'patCP9WW5QHro9aJo.35d1e9e487e956f3017cc9f0fd52a12ca62345d5aeb58239da55770227009a31';
const BASE_ID = 'appqLhT06HpZl1m5a';
const PRODUCTS_TABLE = 'Catalog'; 
const ORDERS_TABLE = 'Orders'; 

const PAYSTACK_PUBLIC_KEY = 'pk_live_64e2c87f59931d03706f8f41e8dca0ffdea7faf7'; 

const AIRTABLE_URL = `https://api.airtable.com/v0/${BASE_ID}/${PRODUCTS_TABLE}`;
const AIRTABLE_ORDERS_URL = `https://api.airtable.com/v0/${BASE_ID}/${ORDERS_TABLE}`;

let allProducts = []; 
let cart = JSON.parse(localStorage.getItem('shop_cart')) || []; 
let currentCategory = 'All'; 
let selectedSize = ''; 

// Delivery configurations
const DELIVERY_FEE = 3000;  // Local Delivery Fee (NGN)
const ODELIVERY_FEE = 7500; // Out of Town Delivery Fee (NGN)

// Initialize application
async function initStore() {
    updateCartUI(); 
    try {
        const response = await fetch(AIRTABLE_URL, {
            headers: { 
                'Authorization': `Bearer ${AIRTABLE_TOKEN}`,
                'Content-Type': 'application/json'
            }
        });
        
        if (!response.ok) throw new Error(`HTTP network error: status ${response.status}`);
        
        const data = await response.json();
        allProducts = data.records;
        
        renderFilterBar();
        route();
    } catch (error) {
        console.error('Initialization Error:', error);
        document.getElementById('products-grid').innerHTML = `
            <div class="loading-state" style="color: #ef4444;">
                <p style="font-weight: bold; font-size: 1.25rem;">Unable to load storefront database.</p>
            </div>
        `;
    }
}

function route() {
    const urlParams = new URLSearchParams(window.location.search);
    const targetProductId = urlParams.get('product');

    if (targetProductId) {
        renderProductDetailsPage(targetProductId);
    } else {
        renderShopGrid();
    }
}

function renderFilterBar() {
    const filterBar = document.getElementById('filter-bar');
    if (!filterBar) return;

    const categories = new Set(['All']);
    allProducts.forEach(record => {
        if (record.fields.category) {
            categories.add(record.fields.category);
        }
    });

    filterBar.innerHTML = '';
    categories.forEach(category => {
        const button = document.createElement('button');
        button.className = `filter-btn ${category === currentCategory ? 'active' : ''}`;
        button.textContent = category;
        button.onclick = () => {
            currentCategory = category;
            document.querySelectorAll('.filter-btn').forEach(btn => btn.classList.remove('active'));
            button.classList.add('active');
            renderShopGrid();
        };
        filterBar.appendChild(button);
    });
}

function renderShopGrid() {
    document.getElementById('details-view').classList.add('hidden');
    document.getElementById('shop-view').classList.remove('hidden');

    const grid = document.getElementById('products-grid');
    grid.innerHTML = ''; 

    const filteredProducts = allProducts.filter(record => {
        if (currentCategory === 'All') return true;
        return record.fields.category === currentCategory;
    });

    if (filteredProducts.length === 0) {
        grid.innerHTML = `<p class="loading-state" style="grid-column: 1/-1;">No products found inside this category.</p>`;
        return;
    }

    filteredProducts.forEach(record => {
        const fields = record.fields;
        const mainImg = fields.main_image?.[0]?.url || 'https://via.placeholder.com/600x600?text=No+Image';
        const formatPrice = fields.price ? parseFloat(fields.price).toLocaleString('en-NG', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : '0.00';

        const card = document.createElement('div');
        card.className = "product-card";
        card.onclick = () => transitionToProductPage(record.id);

        card.innerHTML = `
            <div class="card-image-wrap">
                <img src="${mainImg}" alt="${fields.name || 'Product'}" loading="lazy">
            </div>
            <div class="card-body">
                <div>
                    <h2 class="card-title">${fields.name || 'Unnamed Item'}</h2>
                    <p class="card-price">₦${formatPrice}</p>
                </div>
                <span class="card-action-text">View Details</span>
            </div>
        `;
        grid.appendChild(card);
    });
}

function renderProductDetailsPage(id) {
    const shopView = document.getElementById('shop-view');
    const detailsView = document.getElementById('details-view');
    const contentContainer = document.getElementById('product-page-content');

    const targetRecord = allProducts.find(item => item.id === id);
    
    if (!targetRecord) {
        contentContainer.innerHTML = `<p class="loading-state">Requested item not found.</p>`;
        shopView.classList.add('hidden');
        detailsView.classList.remove('hidden');
        return;
    }

    const fields = targetRecord.fields;
    const mainImg = fields.main_image?.[0]?.url || 'https://via.placeholder.com/600x600?text=No+Image';
    const formatPrice = fields.price ? parseFloat(fields.price).toLocaleString('en-NG', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : '0.00';
    
    selectedSize = '';

    let galleryHtml = '';
    if (fields.gallery && Array.isArray(fields.gallery)) {
        fields.gallery.forEach(img => {
            if(img?.url) {
                galleryHtml += `
                    <div class="thumb-item">
                        <img src="${img.url}" alt="Gallery preview" onclick="swapFeaturedDisplayImage('${img.url}')">
                    </div>`;
            }
        });
    }

    let sizesHtml = '';
    if (fields.sizes) {
        const sizeOptions = fields.sizes.split(',').map(s => s.trim());
        sizesHtml = `
            <div class="size-selector-container">
                <h3 class="size-heading">Select Size:</h3>
                <div class="size-options-grid">
                    ${sizeOptions.map(size => `
                        <button class="size-chip" onclick="handleSizeSelection(this, '${size}')">${size}</button>
                    `).join('')}
                </div>
            </div>
        `;
    }

    contentContainer.innerHTML = `
        <div class="gallery-container">
            <div class="main-featured-image">
                <img id="featured-display" src="${mainImg}" alt="${fields.name || 'Product'}">
            </div>
            <div class="thumbnails-grid">
                <div class="thumb-item">
                    <img src="${mainImg}" alt="Thumbnail View" onclick="swapFeaturedDisplayImage('${mainImg}')">
                </div>
                ${galleryHtml}
            </div>
        </div>

        <div class="details-content-column">
            <div>
                <span class="product-meta-tag">${fields.category || 'Premium Collection'}</span>
                <h1 class="product-main-title">${fields.name || 'Unnamed Product'}</h1>
                <p class="product-main-price">₦${formatPrice}</p>
                ${sizesHtml}
                <hr class="divider">
                <h3 class="desc-heading">Description</h3>
                <p class="desc-text">${fields.description || 'No system details summary currently registered for this SKU.'}</p>
            </div>

            <div>
                <button class="buy-now-btn" onclick="addItemToCart('${targetRecord.id}', '${fields.sizes ? true : false}')">
                    Add To Cart
                </button>
                <p class="redirect-notice">Items accumulate locally inside checkout drawer space counters.</p>
            </div>
        </div>
    `;

    shopView.classList.add('hidden');
    detailsView.classList.remove('hidden');
    window.scrollTo({ top: 0, behavior: 'smooth' });
}

function handleSizeSelection(buttonElement, sizeValue) {
    document.querySelectorAll('.size-chip').forEach(chip => chip.classList.remove('selected'));
    buttonElement.classList.add('selected');
    selectedSize = sizeValue;
}

// ==========================================
//             CART SYSTEM LOGIC
// ==========================================
function toggleCartDrawer(open) {
    const drawer = document.getElementById('cart-drawer');
    const overlay = document.getElementById('cart-drawer-overlay');
    if (open) {
        drawer.classList.remove('hidden');
        overlay.classList.remove('hidden');
    } else {
        drawer.classList.add('hidden');
        overlay.classList.add('hidden');
    }
}

function addItemToCart(id, productHasSizes) {
    const targetProduct = allProducts.find(item => item.id === id);
    if (!targetProduct) return;

    if (productHasSizes && !selectedSize) {
        alert("Please select a product size choice before adding to your cart.");
        return;
    }

    const cartUniqueId = `${id}_${selectedSize}`;
    const existingCartItem = cart.find(item => item.cartItemId === cartUniqueId);

    if (existingCartItem) {
        existingCartItem.quantity += 1;
    } else {
        cart.push({
            cartItemId: cartUniqueId, 
            id: id,
            name: targetProduct.fields.name || 'Item',
            price: parseFloat(targetProduct.fields.price || 0),
            image: targetProduct.fields.main_image?.[0]?.url || 'https://via.placeholder.com/150',
            size: selectedSize, 
            quantity: 1
        });
    }

    syncCartStorage();
    toggleCartDrawer(true);
}

function updateCartQuantity(cartUniqueId, change) {
    const item = cart.find(item => item.cartItemId === cartUniqueId);
    if (!item) return;

    item.quantity += change;
    if (item.quantity <= 0) {
        cart = cart.filter(item => item.cartItemId !== cartUniqueId);
    }
    syncCartStorage();
}

function removeCartItem(cartUniqueId) {
    cart = cart.filter(item => item.cartItemId !== cartUniqueId);
    syncCartStorage();
}

function syncCartStorage() {
    localStorage.setItem('shop_cart', JSON.stringify(cart));
    updateCartUI();
}

function handleFulfillmentChange() {
    const addressContainer = document.getElementById('address-field-container');
    const isDelivery = document.getElementById('fulfillment-delivery')?.checked;
    const isoDelivery = document.getElementById('fulfillment-odelivery')?.checked;
    
    if (isDelivery || isoDelivery) {
        addressContainer.classList.remove('hidden');
    } else {
        addressContainer.classList.add('hidden');
        const addressInput = document.getElementById('customer-address');
        if (addressInput) addressInput.value = ''; 
    }
    
    updateCartUI(); 
}

function updateCartUI() {
    const cartItemsContainer = document.getElementById('cart-items-container');
    const badge = document.getElementById('cart-count-badge');
    const totalDisplay = document.getElementById('cart-total-price');
    
    let totalItemsCount = 0;
    let totalPriceCount = 0;
    
    cartItemsContainer.innerHTML = '';

    if (cart.length === 0) {
        cartItemsContainer.innerHTML = `<p class="empty-cart-text">Your cart is empty.</p>`;
    } else {
        cart.forEach(item => {
            totalItemsCount += item.quantity;
            totalPriceCount += (item.price * item.quantity);

            const sizeTagHtml = item.size ? `<span class="cart-item-size-tag">Size: ${item.size}</span>` : '';
            const formatItemTotal = (item.price * item.quantity).toLocaleString('en-NG', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

            const itemElement = document.createElement('div');
            itemElement.className = 'cart-item';
            itemElement.innerHTML = `
                <img src="${item.image}" alt="${item.name}" class="cart-item-img">
                <div class="cart-item-details">
                    <h4 class="cart-item-title">${item.name}</h4>
                    <p class="cart-item-price">₦${formatItemTotal}</p>
                    ${sizeTagHtml}
                    <div class="cart-item-qty-actions">
                        <button class="qty-btn" onclick="updateCartQuantity('${item.cartItemId}', -1)">-</button>
                        <span>${item.quantity}</span>
                        <button class="qty-btn" onclick="updateCartQuantity('${item.cartItemId}', 1)">+</button>
                    </div>
                </div>
                <button class="cart-item-remove-btn" onclick="removeCartItem('${item.cartItemId}')">Remove</button>
            `;
            cartItemsContainer.appendChild(itemElement);
        });
    }

    const deliveryToggle = document.getElementById('fulfillment-delivery');
    const deliveryTogglee = document.getElementById('fulfillment-odelivery');
    const isDeliverySelected = deliveryToggle ? deliveryToggle.checked : false;
    const isDeliverySelectedd = deliveryTogglee ? deliveryTogglee.checked : false;

    let appliedFee = 0;
    if (cart.length > 0) {
        if (isDeliverySelected) appliedFee = DELIVERY_FEE;
        else if (isDeliverySelectedd) appliedFee = ODELIVERY_FEE;
    }

    if (appliedFee > 0) {
        totalPriceCount += appliedFee;
        const feeElement = document.createElement('div');
        feeElement.className = 'cart-item delivery-fee-row';
        feeElement.style.padding = '10px 0';
        feeElement.style.borderTop = '1px dashed #ccc';
        feeElement.innerHTML = `
            <div style="flex: 1; padding-left: 10px;">
                <h4 style="margin:0; font-size:0.9rem;">Shipping & Delivery Fee</h4>
                <p style="margin:0; color:#6b7280; font-size:0.85rem;">Flat Rate</p>
            </div>
            <span style="font-weight:600; padding-right:10px;">₦${appliedFee.toLocaleString('en-NG', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
        `;
        cartItemsContainer.appendChild(feeElement);
    }

    badge.innerText = totalItemsCount;
    totalDisplay.innerText = `₦${totalPriceCount.toLocaleString('en-NG', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

// ==========================================
//       PAYSTACK POPUP & CHECKOUT PIPELINE
// ==========================================
function proceedToCheckout() {
    if (cart.length === 0) {
        alert("Your cart is empty!");
        return;
    }

    const nameInput = document.getElementById('customer-name').value.trim();
    const emailInput = document.getElementById('customer-email').value.trim();
    const phoneInput = document.getElementById('customer-phone').value.trim();
    const isDelivery = document.getElementById('fulfillment-delivery')?.checked;
    const isoDelivery = document.getElementById('fulfillment-odelivery')?.checked;
    const addressInput = document.getElementById('customer-address') ? document.getElementById('customer-address').value.trim() : '';

    if (!nameInput) { alert("Please enter your full name."); return; }
    if (!emailInput || !emailInput.includes('@')) { alert("Please enter a valid email address."); return; }
    if (!phoneInput || phoneInput.length < 5) { alert("Please enter a valid contact phone number."); return; }

    if ((isDelivery || isoDelivery) && !addressInput) {
        alert("Please provide a physical delivery address for fulfillment.");
        return;
    }

    let grandTotal = 0;
    cart.forEach(item => {
        grandTotal += (item.price * item.quantity);
    });
    
    let fulfillmentLabel = "Pickup";
    if (isDelivery) {
        grandTotal += DELIVERY_FEE;
        fulfillmentLabel = "Standard Delivery";
    } else if (isoDelivery) {
        grandTotal += ODELIVERY_FEE;
        fulfillmentLabel = "Out of Town Delivery";
    }

    const paystackAmount = Math.round(grandTotal * 100);
    const paystack = new PaystackPop();
    
    paystack.newTransaction({
        key: PAYSTACK_PUBLIC_KEY,
        email: emailInput,
        amount: paystackAmount,
        currency: "NGN",
        metadata: {
            custom_fields: [
                { display_name: "Customer Name", variable_name: "customer_name", value: nameInput },
                { display_name: "Customer Phone", variable_name: "customer_phone", value: phoneInput },
                { display_name: "Fulfillment Method", variable_name: "fulfillment_method", value: fulfillmentLabel },
                { display_name: "Delivery Address", variable_name: "delivery_address", value: (isDelivery || isoDelivery) ? addressInput : "N/A - Store Pickup" },
                {
                    display_name: "Cart Summary Breakdown",
                    variable_name: "cart_summary",
                    value: cart.map(i => `${i.name} ${i.size ? `[Size: ${i.size}]` : ''} (Qty: ${i.quantity})`).join(', ')
                }
            ]
        },
        onSuccess: function(transaction) {
            logOrderToAirtable({
                reference: transaction.reference,
                name: nameInput,
                email: emailInput,
                phone: phoneInput,
                total: grandTotal,
                fulfillment: fulfillmentLabel,
                address: (isDelivery || isoDelivery) ? addressInput : "N/A"
            });
        },
        onCancel: function() {
            alert("Payment window closed.");
        }
    });
}

async function logOrderToAirtable(orderData) {
    const itemSummaries = cart.map(i => `${i.name} ${i.size ? `(Size: ${i.size})` : ''} x${i.quantity}`).join('\n');
    
    // Airtable natively requires attachment structures to pass as arrays of image link URL objects
    const airtableImages = cart.filter(i => i.image).map(i => ({ url: i.image }));

    const payload = {
        records: [
            {
                fields: {
                    order_id: orderData.reference,
                    customer_name: orderData.name,
                    customer_email: orderData.email,
                    customer_phone: orderData.phone,
                    fulfillment_type: orderData.fulfillment, 
                    delivery_address: orderData.address,     
                    total_paid: parseFloat(orderData.total), 
                    items_summary: itemSummaries,
                    product_images: airtableImages
                }
            }
        ]
    };

    try {
        const response = await fetch(AIRTABLE_ORDERS_URL, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${AIRTABLE_TOKEN}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(payload)
        });

        if (!response.ok) {
            const errBody = await response.text();
            throw new Error(`Airtable Sync Channel Error: ${response.status} - ${errBody}`);
        }
        
        alert(`Thank you! Order recorded successfully. Reference: ${orderData.reference}`);
        
        cart = [];
        syncCartStorage();
        
        document.getElementById('customer-name').value = '';
        document.getElementById('customer-email').value = '';
        document.getElementById('customer-phone').value = '';
        if(document.getElementById('customer-address')) document.getElementById('customer-address').value = '';

        const pickupToggle = document.getElementById('fulfillment-pickup');
        if (pickupToggle) {
            pickupToggle.checked = true;
            handleFulfillmentChange();
        }
        
        toggleCartDrawer(false);
        navigateToHome(null);
        
    } catch (error) {
        console.error("Orders Database Logging Error:", error);
        alert(`Payment successful, but failed to log order automatically. Please save your receipt reference: ${orderData.reference}`);


        cart = [];
        syncCartStorage();
        
        document.getElementById('customer-name').value = '';
        document.getElementById('customer-email').value = '';
        document.getElementById('customer-phone').value = '';
        if(document.getElementById('customer-address')) document.getElementById('customer-address').value = '';

        const pickupToggle = document.getElementById('fulfillment-pickup');
        if (pickupToggle) {
            pickupToggle.checked = true;
            handleFulfillmentChange();
        }
        
        toggleCartDrawer(false);
        navigateToHome(null);
    }
}

// ==========================================
//        UX INTERACTIVE ROUTING UTILS
// ==========================================
function transitionToProductPage(id) {
    const nextUrl = `${window.location.protocol}//${window.location.host}${window.location.pathname}?product=${id}`;
    window.history.pushState({ path: nextUrl }, '', nextUrl);
    route();
}

function navigateToHome(event) {
    if(event) event.preventDefault();
    const resetUrl = `${window.location.protocol}//${window.location.host}${window.location.pathname}`;
    window.history.pushState({ path: resetUrl }, '', resetUrl);
    route();
}

function swapFeaturedDisplayImage(imgSourcePath) {
    const displayFrame = document.getElementById('featured-display');
    if (!displayFrame) return;
    displayFrame.style.opacity = 0.3;
    setTimeout(() => {
        displayFrame.src = imgSourcePath;
        displayFrame.style.opacity = 1;
    }, 120);
}

window.onpopstate = function() {
    route();
};

initStore();