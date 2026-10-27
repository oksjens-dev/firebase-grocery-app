import React, { useState, useEffect, useMemo, useRef } from 'react';
import {
  ChefHat,
  ShoppingCart,
  History,
  Calendar,
  PieChart,
  Plus,
  Trash2,
  Check,
  X,
  ArrowRight,
  RefreshCw,
  Utensils,
  Award,
  CalendarPlus,
  Trophy,
  Edit2,
  Save,
  Search,
  AlertCircle,
  Home,
  Settings,
  ChevronRight,
  ShoppingBag,
  Clock3,
  Database,
  Leaf,
  Apple,
  Milk,
  Beef,
  Wheat,
  Soup,
  CupSoda,
  Candy,
  HeartPulse,
  Package,
  MoreHorizontal
} from 'lucide-react';

// --- Firebase Imports ---
import { initializeApp } from 'firebase/app';
import {
  getAuth,
  signInAnonymously,
  onAuthStateChanged,
  signInWithCustomToken
} from 'firebase/auth';
import {
  getFirestore,
  collection,
  addDoc,
  updateDoc,
  deleteDoc,
  doc,
  onSnapshot,
  serverTimestamp,
  writeBatch
} from 'firebase/firestore';
import {
  chooseMergedItem,
  consolidateItemEntries,
  findDuplicateGroups,
  findItemSuggestions,
  findSemanticMatch,
  inferItemCategory,
  inferPreferredCategory,
  itemSimilarity,
  normalizeItemName,
} from './itemMatching';
import { buildShoppingAnalytics, eventYear, getDailyShoppingInsight } from './shoppingAnalytics';

// --- Firebase Configuration ---
const getFirebaseConfig = () => {
  // 1. Try Canvas Preview Environment (Injected by system)
  if (typeof globalThis.__firebase_config !== 'undefined') {
    return JSON.parse(globalThis.__firebase_config);
  }

  // 2. Try Vite Environment Variables (Standard for Vercel + Vite)
  try {
    if (import.meta.env && import.meta.env.VITE_FIREBASE_API_KEY) {
      return {
        apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
        authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
        projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
        storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
        messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
        appId: import.meta.env.VITE_FIREBASE_APP_ID,
      };
    }
  } catch {
    // Ignore errors if not in a Vite environment
  }

  // 3. Hardcoded Fallback
  return {
      apiKey: "AIzaSyClZXzh2kdD8pCbNaW6EDRUENERrIYOakU",
      authDomain: "our-grocery-app--muc-kitchen.firebaseapp.com",
      projectId: "our-grocery-app--muc-kitchen",
      storageBucket: "our-grocery-app--muc-kitchen.firebasestorage.app",
      messagingSenderId: "167242896960",
      appId: "1:167242896960:web:12ee5a8f54f78b496571a5"
  };
};

const firebaseConfig = getFirebaseConfig();
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

const appId = typeof globalThis.__app_id !== 'undefined' ? globalThis.__app_id : 'default-app-id';

// --- Constants ---
const DEFAULT_CATEGORIES = [
  { id: 'veggies', name: 'Veggies', icon: Leaf },
  { id: 'herbs', name: 'Herbs', icon: Leaf },
  { id: 'fruit', name: 'Fruit', icon: Apple },
  { id: 'dairy', name: 'Dairy, Eggs & Alternatives', icon: Milk },
  { id: 'meat', name: 'Meat & Fish', icon: Beef },
  { id: 'pasta', name: 'Bread, Pasta & Grains', icon: Wheat },
  { id: 'sauces', name: 'Sauces, Spices & Cans', icon: Soup },
  { id: 'drinks', name: 'Drinks', icon: CupSoda },
  { id: 'sweets', name: 'Sweets & Snacks', icon: Candy },
  { id: 'household', name: 'Household', icon: Home },
  { id: 'toiletries', name: 'Toiletries & Health', icon: HeartPulse },
  { id: 'other', name: 'Other', icon: Package },
];

const formatQuantity = (item) => {
  const value = Math.max(0.01, Number(item.quantityValue || item.quantity || 1));
  const unit = item.quantityUnit || 'x';
  return unit === 'x' ? `${value}×` : `${value}${unit}`;
};

// --- Helper Components ---

const Modal = ({ isOpen, onClose, title, children, bottomSheet = false }) => {
  const [sheetHeight, setSheetHeight] = useState(78);
  const dragState = useRef(null);
  if (!isOpen) return null;
  const startDrag = (event) => {
    dragState.current = { y: event.clientY, height: sheetHeight };
    event.currentTarget.setPointerCapture(event.pointerId);
  };
  const moveDrag = (event) => {
    if (!dragState.current) return;
    const delta = ((dragState.current.y - event.clientY) / window.innerHeight) * 100;
    setSheetHeight(Math.min(94, Math.max(44, dragState.current.height + delta)));
  };
  const endDrag = () => {
    if (sheetHeight < 58) setSheetHeight(48);
    else if (sheetHeight < 84) setSheetHeight(74);
    else setSheetHeight(94);
    dragState.current = null;
  };
  return (
    <div className={`fixed inset-0 z-[100] flex ${bottomSheet ? 'items-end' : 'items-center justify-center p-4'} bg-black/30 backdrop-blur-sm animate-fade-in`}>
      <div style={bottomSheet ? { height: `${sheetHeight}dvh`, maxHeight: 'calc(100dvh - env(safe-area-inset-top) - 8px)' } : undefined} className={`bg-[#fffcf8] w-full max-w-md min-h-0 flex flex-col animate-slide-up shadow-2xl ${bottomSheet ? 'rounded-t-[2rem]' : 'rounded-2xl max-h-[85vh]'}`}>
        {bottomSheet && <button type="button" aria-label="Resize Add Item sheet" onPointerDown={startDrag} onPointerMove={moveDrag} onPointerUp={endDrag} className="h-7 shrink-0 touch-none cursor-ns-resize"><span className="block w-10 h-1.5 bg-gray-300 rounded-full mx-auto" /></button>}
        <div className="flex justify-between items-center p-4 border-b shrink-0 bg-white rounded-t-2xl">
          <h2 className="text-xl font-bold text-gray-800 truncate pr-4">{title}</h2>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-full transition-colors shrink-0">
            <X size={20} />
          </button>
        </div>
        <div className="p-4 min-h-0 overflow-y-auto overscroll-contain touch-pan-y custom-scrollbar">
          {children}
        </div>
      </div>
    </div>
  );
};

const CategoryBadge = ({ categoryId }) => {
  const defaultCat = DEFAULT_CATEGORIES.find(c => c.id === categoryId);
  const label = defaultCat ? defaultCat.name : categoryId;
  const Icon = defaultCat?.icon || Package;

  return (
    <span className="text-xs px-2 py-1 rounded-full font-medium bg-purple-50 text-[#7548D8] border border-purple-100 truncate max-w-[180px] inline-flex items-center gap-1 align-middle">
      <Icon size={12} /> {label}
    </span>
  );
};

const PodiumStep = ({ rank, recipe, height, color, textColor }) => (
  <div className="flex flex-col items-center justify-end group relative flex-1">
    {recipe && (
      <div className="absolute -top-8 bg-black/80 text-white text-[10px] py-1 px-2 rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap z-10 pointer-events-none">
        {recipe.count} times
      </div>
    )}
    <div className={`text-[10px] font-medium text-white/90 mb-1 text-center truncate w-full px-1 ${!recipe ? 'opacity-0' : ''}`}>
      {recipe ? recipe.name : '-'}
    </div>
    <div className={`w-full max-w-[60px] ${height} ${color} rounded-t-lg flex items-start justify-center pt-2 shadow-inner border-t border-white/10 transition-all hover:brightness-110`}>
      <span className={`font-bold ${textColor} text-sm`}>{rank}</span>
    </div>
  </div>
);

// New Component for Editable Recipe Details
const RecipeDetailContent = ({ recipe, onClose, onUpdate, onAddIngredients }) => {
  const [isEditing, setIsEditing] = useState(false);
  const [editedName, setEditedName] = useState(recipe.name);
  const [editedIngredients, setEditedIngredients] = useState(
    recipe.ingredients.map(i => ({ 
      name: i.name, 
      category: i.category || 'other' 
    }))
  );
  const [editedInstructions, setEditedInstructions] = useState(recipe.instructions || '');

  const handleSave = () => {
    const ingredientsList = editedIngredients
      .filter(l => l.name.trim().length > 0)
      .map(l => ({ name: l.name.trim(), category: l.category, isDone: false }));
      
    onUpdate(recipe.id, {
      name: editedName,
      ingredients: ingredientsList,
      instructions: editedInstructions
    });
    setIsEditing(false);
  };

  const updateIngredient = (index, field, value) => {
    const newIngredients = [...editedIngredients];
    newIngredients[index] = { ...newIngredients[index], [field]: value };
    setEditedIngredients(newIngredients);
  };

  const addIngredient = () => {
    setEditedIngredients([...editedIngredients, { name: '', category: 'other' }]);
  };

  const removeIngredient = (index) => {
    const newIngredients = editedIngredients.filter((_, i) => i !== index);
    setEditedIngredients(newIngredients);
  };

  if (isEditing) {
    return (
      <div className="space-y-4">
        <div>
          <label className="block text-sm font-bold text-gray-500 uppercase mb-1">Recipe Name</label>
          <input 
            type="text" 
            value={editedName} 
            onChange={(e) => setEditedName(e.target.value)} 
            className="w-full bg-gray-50 p-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-indigo-500 outline-none font-bold text-gray-800"
          />
        </div>
        
        <div>
          <label className="block text-sm font-bold text-gray-500 uppercase mb-2">Ingredients</label>
          <div className="space-y-2">
            {editedIngredients.map((ing, index) => (
              <div key={index} className="flex gap-2">
                <input 
                  type="text"
                  value={ing.name}
                  onChange={(e) => updateIngredient(index, 'name', e.target.value)}
                  placeholder="Ingredient"
                  className="flex-1 min-w-0 bg-gray-50 p-2.5 rounded-lg border border-gray-200 focus:ring-2 focus:ring-indigo-500 outline-none text-sm"
                />
                <select
                  value={ing.category}
                  onChange={(e) => updateIngredient(index, 'category', e.target.value)}
                  className="w-24 sm:w-32 bg-gray-50 p-2.5 rounded-lg border border-gray-200 focus:ring-2 focus:ring-indigo-500 outline-none text-sm"
                >
                  <option value="other">Other</option>
                  {DEFAULT_CATEGORIES.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
                <button 
                  onClick={() => removeIngredient(index)}
                  className="p-2.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                >
                  <X size={18} />
                </button>
              </div>
            ))}
          </div>
          <button 
            onClick={addIngredient}
            className="mt-2 text-sm font-medium text-indigo-600 hover:text-indigo-700 flex items-center gap-1"
          >
            <Plus size={16} /> Add Ingredient
          </button>
        </div>

        <div>
          <label className="block text-sm font-bold text-gray-500 uppercase mb-1">Instructions</label>
          <textarea 
            value={editedInstructions} 
            onChange={(e) => setEditedInstructions(e.target.value)} 
            className="w-full bg-gray-50 p-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-indigo-500 outline-none h-32 resize-none text-sm" 
          />
        </div>
        <div className="flex gap-2 pt-2">
          <button 
            onClick={() => setIsEditing(false)} 
            className="flex-1 bg-gray-100 text-gray-700 p-3 rounded-xl font-bold hover:bg-gray-200 transition-colors"
          >
            Cancel
          </button>
          <button 
            onClick={handleSave} 
            className="flex-1 bg-indigo-600 text-white p-3 rounded-xl font-bold hover:bg-indigo-700 transition-colors flex items-center justify-center gap-2"
          >
            <Save size={18} /> Save Changes
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-end">
        <button 
          onClick={() => setIsEditing(true)} 
          className="flex items-center gap-1.5 text-sm font-medium text-indigo-600 bg-indigo-50 px-3 py-1.5 rounded-lg hover:bg-indigo-100 transition-colors"
        >
          <Edit2 size={16} /> Edit Recipe
        </button>
      </div>

      <div className="bg-gray-50 p-4 rounded-xl">
         <h4 className="font-bold text-gray-500 text-xs uppercase tracking-wide mb-3">Ingredients</h4>
         <ul className="space-y-2">
           {recipe.ingredients.map((ing, i) => (
              <li key={i} className="flex items-start gap-3 text-gray-800 text-sm">
                <div className="w-1.5 h-1.5 bg-indigo-400 rounded-full mt-1.5 shrink-0"></div> 
                <span className="leading-snug">{ing.name}</span>
              </li>
           ))}
         </ul>
      </div>

      {recipe.instructions && (
        <div>
           <h4 className="font-bold text-gray-500 text-xs uppercase tracking-wide mb-2">Instructions</h4>
           <div className="text-gray-700 text-sm whitespace-pre-wrap leading-relaxed bg-white border border-gray-100 p-4 rounded-xl">
             {recipe.instructions}
           </div>
        </div>
      )}

      <button 
        onClick={() => { onAddIngredients(recipe); onClose(); }} 
        className="w-full bg-indigo-600 text-white p-4 rounded-xl font-bold hover:bg-indigo-700 transition-colors shadow-lg shadow-indigo-200 active:scale-95 flex items-center justify-center gap-2"
      >
        <Plus size={20} /> Add Ingredients to List
      </button>
    </div>
  );
};

// --- Main App Component ---

export default function App() {
  const [user, setUser] = useState(null);
  const [authError, setAuthError] = useState(null);
  const [isLoadingLong, setIsLoadingLong] = useState(false);
  const [activeTab, setActiveTab] = useState('home');
  
  // Data State
  const [items, setItems] = useState([]);
  const [recipes, setRecipes] = useState([]);
  const [mealPlan, setMealPlan] = useState([]);
  const [purchaseEvents, setPurchaseEvents] = useState([]);
  
  // UI State
  const [isAddItemOpen, setIsAddItemOpen] = useState(false);
  const [isAddRecipeOpen, setIsAddRecipeOpen] = useState(false);
  const [selectedRecipe, setSelectedRecipe] = useState(null);
  const [isSelectRecipeOpen, setIsSelectRecipeOpen] = useState(false);
  const [planningDayOffset, setPlanningDayOffset] = useState(null);
  
  // Search States
  const [recipeSearchTerm, setRecipeSearchTerm] = useState('');
  const [mealSearchTerm, setMealSearchTerm] = useState('');
  const [historySearchTerm, setHistorySearchTerm] = useState('');
  const [shoppingSearchTerm, setShoppingSearchTerm] = useState('');
  const [recentFilter, setRecentFilter] = useState('all');
  const isMergingDuplicates = useRef(false);
  const isMigratingCategories = useRef(false);

  // Form State
  const [newItemName, setNewItemName] = useState('');
  const [newItemCategory, setNewItemCategory] = useState('other');
  const [selectedItemId, setSelectedItemId] = useState(null);
  const [quantityPreset, setQuantityPreset] = useState('1');
  const [customQuantityOpen, setCustomQuantityOpen] = useState(false);
  const [customQuantity, setCustomQuantity] = useState('1');
  const [customUnit, setCustomUnit] = useState('x');
  const [deleteYear, setDeleteYear] = useState(null);
  
  const [newRecipeName, setNewRecipeName] = useState('');
  const [newRecipeIngredients, setNewRecipeIngredients] = useState([{ name: '', category: 'other' }]); 
  const [newRecipeInstructions, setNewRecipeInstructions] = useState('');

  // --- Auth & Data Sync ---

  useEffect(() => {
    const timer = setTimeout(() => setIsLoadingLong(true), 4000);

    const initAuth = async () => {
      try {
        if (typeof globalThis.__initial_auth_token !== 'undefined' && globalThis.__initial_auth_token) {
          await signInWithCustomToken(auth, globalThis.__initial_auth_token);
        } else {
          await signInAnonymously(auth);
        }
      } catch (error) {
        console.error("Auth failed:", error);
        setAuthError(error.message);
      }
    };
    initAuth();

    const unsubscribe = onAuthStateChanged(auth, (u) => {
      if (u) {
        setUser(u);
        setAuthError(null);
      }
    });
    
    return () => {
      unsubscribe();
      clearTimeout(timer);
    };
  }, []);

  useEffect(() => {
    if (!user) return;

    const itemsRef = collection(db, 'artifacts', appId, 'public', 'data', 'items');
    const recipesRef = collection(db, 'artifacts', appId, 'public', 'data', 'recipes');
    const mealsRef = collection(db, 'artifacts', appId, 'public', 'data', 'meals');
    const purchasesRef = collection(db, 'artifacts', appId, 'public', 'data', 'purchaseEvents');

    const unsubItems = onSnapshot(itemsRef, (snapshot) => {
      const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setItems(data);
    }, (err) => console.error("Items sync error", err));

    const unsubRecipes = onSnapshot(recipesRef, (snapshot) => {
      const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setRecipes(data);
    }, (err) => console.error("Recipes sync error", err));

    const unsubMeals = onSnapshot(mealsRef, (snapshot) => {
      const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setMealPlan(data);
    }, (err) => console.error("Meals sync error", err));
    const unsubPurchases = onSnapshot(purchasesRef, (snapshot) => {
      setPurchaseEvents(snapshot.docs.map(eventDoc => ({ id: eventDoc.id, ...eventDoc.data() })));
    }, (err) => console.error('Purchase events sync error', err));

    return () => {
      unsubItems();
      unsubRecipes();
      unsubMeals();
      unsubPurchases();
    };
  }, [user]);

  useEffect(() => {
    if (!user || items.length < 2 || isMergingDuplicates.current) return;

    const duplicateGroups = findDuplicateGroups(items);
    if (duplicateGroups.length === 0) return;

    const mergeDuplicates = async () => {
      isMergingDuplicates.current = true;
      try {
        for (const group of duplicateGroups) {
          const { keeper, duplicates, data } = chooseMergedItem(group);
          const batch = writeBatch(db);
          batch.update(
            doc(db, 'artifacts', appId, 'public', 'data', 'items', keeper.id),
            data
          );
          duplicates.forEach((duplicate) => {
            batch.delete(doc(db, 'artifacts', appId, 'public', 'data', 'items', duplicate.id));
          });
          await batch.commit();
        }
      } catch (error) {
        console.error('Error merging duplicate items', error);
      } finally {
        isMergingDuplicates.current = false;
      }
    };

    mergeDuplicates();
  }, [items, user]);

  useEffect(() => {
    if (!user || isMigratingCategories.current || (items.length === 0 && recipes.length === 0)) return;
    if (findDuplicateGroups(items).length > 0) return;

    const itemUpdates = items
      .map((item) => ({ item, category: inferPreferredCategory(item.name) }))
      .filter(({ item, category }) => category !== 'other' && category !== item.category);

    const recipeUpdates = recipes.reduce((updates, recipe) => {
      let changed = false;
      const ingredients = (recipe.ingredients || []).map((ingredient) => {
        const category = inferPreferredCategory(ingredient.name);
        if (category === 'other' || category === ingredient.category) return ingredient;
        changed = true;
        return { ...ingredient, category };
      });
      if (changed) updates.push({ recipe, ingredients });
      return updates;
    }, []);

    if (itemUpdates.length === 0 && recipeUpdates.length === 0) return;

    const migrateCategories = async () => {
      isMigratingCategories.current = true;
      try {
        const batch = writeBatch(db);
        itemUpdates.forEach(({ item, category }) => {
          batch.update(
            doc(db, 'artifacts', appId, 'public', 'data', 'items', item.id),
            { category }
          );
        });
        recipeUpdates.forEach(({ recipe, ingredients }) => {
          batch.update(
            doc(db, 'artifacts', appId, 'public', 'data', 'recipes', recipe.id),
            { ingredients }
          );
        });
        await batch.commit();
      } catch (error) {
        console.error('Error migrating grocery categories', error);
      } finally {
        isMigratingCategories.current = false;
      }
    };

    migrateCategories();
  }, [items, recipes, user]);

  // --- Derived State ---
  const shoppingList = useMemo(() => items.filter(i => !i.isBought).sort((a,b) => b.createdAt?.seconds - a.createdAt?.seconds), [items]);
  const historyList = useMemo(() => items.filter(i => i.isBought).sort((a,b) => b.boughtAt?.seconds - a.boughtAt?.seconds), [items]);
  
  // Filtered lists
  const filteredShoppingList = useMemo(() => {
    if (!shoppingSearchTerm) return shoppingList;
    return shoppingList.filter(item => item.name.toLowerCase().includes(shoppingSearchTerm.toLowerCase()));
  }, [shoppingList, shoppingSearchTerm]);

  const filteredHistory = useMemo(() => {
    return historyList.filter(item => {
      if (!item.name.toLowerCase().includes(historySearchTerm.toLowerCase())) return false;
      if (recentFilter === 'all') return true;
      const bought = item.boughtAt?.seconds ? item.boughtAt.seconds * 1000 : 0;
      return bought && Date.now() - bought <= (recentFilter === 'week' ? 7 : 31) * 86400000;
    });
  }, [historyList, historySearchTerm, recentFilter]);

  const filteredRecipes = useMemo(() => {
    if (!recipeSearchTerm) return recipes;
    return recipes.filter(r => r.name.toLowerCase().includes(recipeSearchTerm.toLowerCase()));
  }, [recipes, recipeSearchTerm]);

  const selectedItem = useMemo(() => items.find(item => item.id === selectedItemId) || null, [items, selectedItemId]);

  const recentItemSuggestions = useMemo(
    () => {
      if (selectedItem) return [];
      const query = normalizeItemName(newItemName);
      return findItemSuggestions(historyList, newItemName).filter(item => {
        const candidate = normalizeItemName(item.name);
        return candidate.includes(query) || query.includes(candidate) || itemSimilarity(item.name, newItemName) >= 0.78;
      });
    },
    [historyList, newItemName, selectedItem]
  );

  const semanticItemMatch = useMemo(
    () => selectedItem || findSemanticMatch(items, newItemName),
    [items, newItemName, selectedItem]
  );

  const autoRecentMatch = useMemo(() => {
    if (recentItemSuggestions.length !== 1 || normalizeItemName(newItemName).length < 3) return null;
    return itemSimilarity(recentItemSuggestions[0].name, newItemName) >= 0.78 ? recentItemSuggestions[0] : null;
  }, [recentItemSuggestions, newItemName]);
  const effectiveItemMatch = semanticItemMatch || autoRecentMatch;
  const isNewItem = Boolean(newItemName.trim() && !effectiveItemMatch && recentItemSuggestions.length === 0);
  const analyticsEvents = useMemo(() => purchaseEvents.length ? purchaseEvents : historyList.map(item => ({
    id: `legacy-${item.id}`,
    checkedAt: item.boughtAt,
    itemName: item.name,
    category: item.category,
  })), [purchaseEvents, historyList]);
  const shoppingAnalytics = useMemo(() => buildShoppingAnalytics(analyticsEvents), [analyticsEvents]);
  const homeInsight = useMemo(() => getDailyShoppingInsight(shoppingAnalytics), [shoppingAnalytics]);

  const topRecipes = useMemo(() => {
    const counts = {};
    mealPlan.forEach(meal => {
      if (meal.recipeId) {
        counts[meal.recipeId] = (counts[meal.recipeId] || 0) + 1;
      }
    });

    return Object.entries(counts)
      .map(([id, count]) => {
        const recipe = recipes.find(r => r.id === id);
        return recipe ? { ...recipe, count } : null;
      })
      .filter(Boolean)
      .sort((a, b) => b.count - a.count)
      .slice(0, 3);
  }, [mealPlan, recipes]);

  const topItems = useMemo(() => {
    return items
      .filter(i => i.buyCount > 0)
      .sort((a, b) => b.buyCount - a.buyCount)
      .slice(0, 5);
  }, [items]);

  const allCategories = useMemo(() => {
    return DEFAULT_CATEGORIES;
  }, []);

  // --- Actions ---

  const addItem = async (name, category = 'other', quantity = { value: 1, unit: 'x' }) => {
    if (!name.trim() || !user) return;
    const requested = typeof quantity === 'number'
      ? { value: Math.max(1, quantity), unit: 'x' }
      : { value: Math.max(0.01, Number(quantity.value) || 1), unit: quantity.unit || 'x' };
    try {
      const existingItem = findSemanticMatch(items, name);
      if (existingItem) {
        const existingRef = doc(db, 'artifacts', appId, 'public', 'data', 'items', existingItem.id);
        if (!existingItem.isBought) {
          const sameUnit = (existingItem.quantityUnit || 'x') === requested.unit;
          await updateDoc(existingRef, {
            quantity: requested.unit === 'x' ? (sameUnit ? Math.max(1, existingItem.quantity || 1) + requested.value : requested.value) : 1,
            quantityValue: sameUnit ? Math.max(1, existingItem.quantityValue || existingItem.quantity || 1) + requested.value : requested.value,
            quantityUnit: requested.unit,
          });
          setNewItemName('');
          return existingItem;
        }

        await updateDoc(existingRef, {
          isBought: false,
          boughtAt: null,
          category: existingItem.category || category,
          quantity: requested.unit === 'x' ? requested.value : 1,
          quantityValue: requested.value,
          quantityUnit: requested.unit,
        });
        setNewItemName('');
        return existingItem;
      }

      await addDoc(collection(db, 'artifacts', appId, 'public', 'data', 'items'), {
        name: name.trim(),
        category,
        isBought: false,
        createdAt: serverTimestamp(),
        buyCount: 0,
        quantity: requested.unit === 'x' ? requested.value : 1,
        quantityValue: requested.value,
        quantityUnit: requested.unit,
      });
      setNewItemName('');
    } catch (e) {
      console.error("Error adding item", e);
    }
  };

  const itemCategoryExamples = useMemo(() => [
    ...items,
    ...recipes.flatMap((recipe) => recipe.ingredients || []),
  ], [items, recipes]);

  const handleNewItemNameChange = (value) => {
    setNewItemName(value);
    setSelectedItemId(null);
    if (value.trim()) {
      setNewItemCategory(inferItemCategory(itemCategoryExamples, value));
    }
  };

  const closeAddItemModal = () => {
    setIsAddItemOpen(false);
    setNewItemName('');
    setNewItemCategory('other');
    setSelectedItemId(null);
    setQuantityPreset('1');
    setCustomQuantityOpen(false);
    setCustomQuantity('1');
    setCustomUnit('x');
  };

  const openAddItemModal = (item = null) => {
    setSelectedItemId(item?.id || null);
    setNewItemName(item?.name || '');
    setNewItemCategory(item?.category || 'other');
    setQuantityPreset('1');
    setCustomQuantityOpen(false);
    setCustomQuantity('1');
    setCustomUnit('x');
    setIsAddItemOpen(true);
  };

  const currentQuantity = () => {
    if (customQuantityOpen) return { value: customQuantity, unit: customUnit };
    return { '1': { value: 1, unit: 'x' }, '500 g': { value: 500, unit: 'g' }, '1 kg': { value: 1, unit: 'kg' }, '1 L': { value: 1, unit: 'L' } }[quantityPreset];
  };

  const submitItem = async (name = effectiveItemMatch?.name || newItemName, category = effectiveItemMatch?.category || newItemCategory) => {
    if (!name.trim()) return;
    await addItem(name, category, currentQuantity());
    closeAddItemModal();
  };

  const toggleItemStatus = async (item) => {
    if (!user) return;
    try {
      const docRef = doc(db, 'artifacts', appId, 'public', 'data', 'items', item.id);
      const batch = writeBatch(db);
      batch.update(docRef, {
        isBought: !item.isBought,
        boughtAt: !item.isBought ? serverTimestamp() : null,
        buyCount: !item.isBought
          ? (item.buyCount || 0) + Math.max(1, item.quantity || 1)
          : item.buyCount
      });
      if (!item.isBought) {
        const eventRef = doc(collection(db, 'artifacts', appId, 'public', 'data', 'purchaseEvents'));
        batch.set(eventRef, {
          sourceItemId: item.id,
          itemName: item.name,
          category: item.category || 'other',
          quantityValue: item.quantityValue || item.quantity || 1,
          quantityUnit: item.quantityUnit || 'x',
          checkedAt: serverTimestamp(),
        });
      }
      await batch.commit();
    } catch (e) {
      console.error("Error toggling item", e);
    }
  };

  const deleteItem = async (id) => {
    if (!user) return;
    try {
      await deleteDoc(doc(db, 'artifacts', appId, 'public', 'data', 'items', id));
    } catch (e) {
      console.error("Error deleting item", e);
    }
  };

  const availableYears = useMemo(() => {
    const years = new Set([new Date().getFullYear()]);
    purchaseEvents.forEach(event => { if (eventYear(event)) years.add(eventYear(event)); });
    historyList.forEach(item => { if (eventYear(item)) years.add(eventYear(item)); });
    return [...years].sort((left, right) => right - left);
  }, [purchaseEvents, historyList]);

  const deleteYearData = async () => {
    if (!user || !deleteYear) return;
    try {
      const targets = [
        ...purchaseEvents.filter(event => eventYear(event) === deleteYear).map(event => ({ collectionName: 'purchaseEvents', id: event.id })),
        ...historyList.filter(item => eventYear(item) === deleteYear).map(item => ({ collectionName: 'items', id: item.id })),
      ];
      for (let index = 0; index < targets.length; index += 450) {
        const batch = writeBatch(db);
        targets.slice(index, index + 450).forEach(target => batch.delete(doc(db, 'artifacts', appId, 'public', 'data', target.collectionName, target.id)));
        await batch.commit();
      }
      setDeleteYear(null);
    } catch (error) {
      console.error('Error deleting yearly shopping data', error);
    }
  };

  const deleteRecipe = async (id) => {
    if (!user) return;
    if (!window.confirm("Are you sure you want to delete this recipe?")) return;
    try {
      await deleteDoc(doc(db, 'artifacts', appId, 'public', 'data', 'recipes', id));
      if (selectedRecipe && selectedRecipe.id === id) setSelectedRecipe(null);
    } catch (e) {
      console.error("Error deleting recipe", e);
    }
  };

  const updateRecipe = async (id, updatedData) => {
    if (!user) return;
    try {
      const docRef = doc(db, 'artifacts', appId, 'public', 'data', 'recipes', id);
      await updateDoc(docRef, updatedData);
      if (selectedRecipe && selectedRecipe.id === id) {
        setSelectedRecipe({ ...selectedRecipe, ...updatedData });
      }
    } catch (e) {
      console.error("Error updating recipe", e);
    }
  };

  const deleteMeal = async (mealId) => {
    if (!user) return;
    if (!window.confirm("Remove this meal from the plan?")) return;
    try {
      await deleteDoc(doc(db, 'artifacts', appId, 'public', 'data', 'meals', mealId));
    } catch (e) {
      console.error("Error deleting meal", e);
    }
  };

  const updateNewRecipeIngredient = (index, field, value) => {
    const updated = [...newRecipeIngredients];
    updated[index] = { ...updated[index], [field]: value };
    setNewRecipeIngredients(updated);
  };

  const addNewRecipeIngredientRow = () => {
    setNewRecipeIngredients([...newRecipeIngredients, { name: '', category: 'other' }]);
  };

  const removeNewRecipeIngredientRow = (index) => {
    setNewRecipeIngredients(newRecipeIngredients.filter((_, i) => i !== index));
  };

  const addRecipe = async () => {
    if (!newRecipeName.trim() || !user) return;
    
    const ingredientsList = newRecipeIngredients
      .filter(ing => ing.name.trim().length > 0)
      .map(ing => ({
        name: ing.name.trim(),
        category: ing.category || 'other',
        isDone: false 
      }));

    try {
      await addDoc(collection(db, 'artifacts', appId, 'public', 'data', 'recipes'), {
        name: newRecipeName.trim(),
        ingredients: ingredientsList,
        instructions: newRecipeInstructions,
        createdAt: serverTimestamp()
      });
      setIsAddRecipeOpen(false);
      setNewRecipeName('');
      setNewRecipeIngredients([{ name: '', category: 'other' }]);
      setNewRecipeInstructions('');
    } catch (e) {
      console.error("Error adding recipe", e);
    }
  };

  const addRecipeToShoppingList = async (recipe, showAlert = true) => {
    if (!user) return;
    const consolidatedIngredients = consolidateItemEntries(recipe.ingredients);

    const promises = consolidatedIngredients.map(async (ing) => {
      await addItem(ing.name, ing.category || 'other', ing.quantity || 1);
    });
    await Promise.all(promises);
    if (showAlert) alert(`Added ingredients for ${recipe.name} to list!`);
  };

  const addHistoryItemBack = (item) => openAddItemModal(item);

  const planMeal = async (recipe, dayOffset) => {
    if (!user) return;
    const date = new Date();
    date.setDate(date.getDate() + dayOffset);

    const existingMeal = mealPlan.find(m => new Date(m.date).toDateString() === date.toDateString());
    
    try {
      if (existingMeal) {
         await deleteDoc(doc(db, 'artifacts', appId, 'public', 'data', 'meals', existingMeal.id));
      }

      await addDoc(collection(db, 'artifacts', appId, 'public', 'data', 'meals'), {
        recipeId: recipe.id,
        date: date.toISOString(),
      });
      
      if (window.confirm(`Do you want to add the ingredients for ${recipe.name} to your shopping list?`)) {
        await addRecipeToShoppingList(recipe, false);
      }
      
      alert(`Planned ${recipe.name} for ${date.toLocaleDateString('en-US', {weekday: 'long'})}!`);
    } catch(e) { console.error(e) }
  };

  // --- Render Header Logic ---
  const renderHeader = () => {
    switch (activeTab) {
      case 'shopping':
        return (
          <div className="py-2 space-y-3">
            <div className="flex justify-between items-start">
              <div>
                <h1 className="text-2xl font-bold text-gray-800">Shopping List</h1>
                <p className="text-sm text-gray-500 mt-1">Grouped by category for a quicker shop.</p>
              </div>
            </div>
            {/* Added Search Bar for Shopping List */}
            <div className="relative">
              <Search className="absolute left-3 top-3 text-gray-400" size={18} />
              <input 
                type="text" 
                placeholder="Search items..." 
                value={shoppingSearchTerm}
                onChange={(e) => setShoppingSearchTerm(e.target.value)}
                className="w-full bg-gray-50 pl-10 pr-10 py-2.5 rounded-xl font-medium outline-none focus:ring-2 ring-indigo-100 border border-transparent focus:border-indigo-200 transition-all text-base"
              />
              {shoppingSearchTerm && (
                <button 
                  onClick={() => setShoppingSearchTerm('')} 
                  className="absolute right-3 top-3 text-gray-400 hover:text-gray-600"
                >
                  <X size={18} />
                </button>
              )}
            </div>
          </div>
        );
      case 'recipes':
        return (
          <div className="py-2 space-y-3">
            <div className="flex justify-between items-start">
              <div>
                <h1 className="text-2xl font-bold text-gray-800">Our Recipes</h1>
                <p className="text-sm text-gray-500 mt-1">Tap + to add a new recipe.</p>
              </div>
              <button
                onClick={() => setIsAddRecipeOpen(true)}
                className="bg-indigo-600 text-white p-2 rounded-full shadow-lg hover:bg-indigo-700 active:scale-95 transition-all"
              >
                <Plus size={24} />
              </button>
            </div>
            <div className="relative">
              <Search className="absolute left-3 top-3 text-gray-400" size={18} />
              <input 
                type="text" 
                placeholder="Search recipes..." 
                value={recipeSearchTerm}
                onChange={(e) => setRecipeSearchTerm(e.target.value)}
                className="w-full bg-gray-50 pl-10 pr-10 py-2.5 rounded-xl font-medium outline-none focus:ring-2 ring-indigo-100 border border-transparent focus:border-indigo-200 transition-all text-base"
              />
              {recipeSearchTerm && (
                <button 
                  onClick={() => setRecipeSearchTerm('')} 
                  className="absolute right-3 top-3 text-gray-400 hover:text-gray-600"
                >
                  <X size={18} />
                </button>
              )}
            </div>
          </div>
        );
      case 'history':
        return (
          <div className="py-2 space-y-3">
            <div>
              <h1 className="text-2xl font-bold text-gray-800">Recently Bought</h1>
              <p className="text-sm text-gray-500 mt-1">Tap + to add back to shopping list.</p>
            </div>
            <div className="relative">
              <Search className="absolute left-3 top-3 text-gray-400" size={18} />
              <input 
                type="text" 
                placeholder="Search history..." 
                value={historySearchTerm}
                onChange={(e) => setHistorySearchTerm(e.target.value)}
                className="w-full bg-gray-50 pl-10 pr-10 py-2.5 rounded-xl font-medium outline-none focus:ring-2 ring-indigo-100 border border-transparent focus:border-indigo-200 transition-all text-base"
              />
              {historySearchTerm && (
                <button 
                  onClick={() => setHistorySearchTerm('')} 
                  className="absolute right-3 top-3 text-gray-400 hover:text-gray-600"
                >
                  <X size={18} />
                </button>
              )}
            </div>
          </div>
        );
      case 'analytics':
        return (
          <div className="py-2">
            <h1 className="text-2xl font-bold text-gray-800">Analytics & Plan</h1>
            <p className="text-sm text-gray-500 mt-1">Tap + for daily meal planning and enjoy the analytics!</p>
          </div>
        );
      default:
        return null;
    }
  };

  // --- Render Content Views ---

  const renderHomeView = () => (
    <div className="space-y-6 pb-24 animate-in fade-in duration-300">
      <div className="flex items-start justify-between">
        <div><p className="text-xs font-bold uppercase tracking-widest text-[#7548D8]">Household overview</p><h1 className="text-3xl font-bold leading-tight mt-2">{new Date().getHours() < 12 ? 'Good Morning' : new Date().getHours() < 18 ? 'Good Afternoon' : 'Good Evening'},<br />Marie &amp; Jens</h1></div>
        <button onClick={() => setActiveTab('settings')} className="p-3 rounded-full bg-white/70 backdrop-blur-xl border border-white shadow-lg text-gray-700"><Settings size={21} /></button>
      </div>
      <div className="rounded-3xl bg-white border border-purple-100 shadow-sm overflow-hidden">
        <button onClick={() => setActiveTab('shopping')} className="w-full flex items-center gap-3 p-4 text-left bg-[#7548D8] text-white">
          <span className="p-2 rounded-xl bg-white/15"><ShoppingCart size={19} /></span><span className="flex-1"><strong className="block">Shopping List</strong><small className="text-white/75">{shoppingList.length} items</small></span><span className="px-2 py-1 rounded-full bg-white/20 text-xs font-bold">{shoppingList.length}</span>
        </button>
        {[[recipes.length, 'recipes', ChefHat, 'Recipes', `${recipes.length} saved`], [historyList.length, 'history', Clock3, 'Recent', `${historyList.length} bought items`], [mealPlan.length, 'analytics', Calendar, 'Planning & Analytics', `${mealPlan.length} meals planned`]].map(([, tab, iconComponent, title, subtitle]) => (
          <button key={tab} onClick={() => setActiveTab(tab)} className="w-full flex items-center gap-3 p-4 text-left border-t border-purple-50">
            <span className="p-2 rounded-xl bg-purple-50 text-[#7548D8]">{React.createElement(iconComponent, { size: 18 })}</span><span className="flex-1"><strong className="block text-gray-800">{title}</strong><small className="text-gray-500">{subtitle}</small></span><ChevronRight size={18} className="text-gray-400" />
          </button>
        ))}
      </div>
      <div><div className="flex justify-between items-center mb-3"><h2 className="text-xl font-bold">This month</h2><button onClick={() => setActiveTab('analytics')} className="text-xs font-bold text-[#7548D8]">Analytics</button></div>
        <button onClick={() => setActiveTab('analytics')} className="w-full flex items-center gap-4 text-left bg-white border border-purple-100 rounded-3xl p-4 shadow-sm">
          <span className="w-14 h-14 grid place-items-center rounded-2xl bg-purple-50 text-[#7548D8] font-extrabold">{homeInsight.value}</span><span><small className="uppercase tracking-widest text-[10px] font-bold text-[#7548D8]">Daily shopping rhythm</small><strong className="block text-gray-800">{homeInsight.title}</strong><span className="text-sm text-gray-500">{homeInsight.detail}</span></span>
        </button>
      </div>
    </div>
  );

  const renderSettingsView = () => (
    <div className="space-y-6 pb-12">
      <button onClick={() => setActiveTab('home')} className="text-sm font-bold text-[#7548D8]">← Home</button>
      <div><p className="text-xs font-bold uppercase tracking-widest text-[#7548D8]">Marie &amp; Jens</p><h1 className="text-3xl font-bold mt-1">Settings</h1></div>
      <section><p className="text-xs font-bold uppercase tracking-widest text-gray-400 mb-2">General</p><div className="rounded-2xl bg-white border border-purple-100"><div className="flex gap-3 items-center p-4"><span className="p-2 rounded-xl bg-purple-50 text-[#7548D8]"><Settings size={18} /></span><span><strong className="block">Categories</strong><small className="text-gray-500">{DEFAULT_CATEGORIES.length} categories · English primary</small></span></div></div></section>
      <section><p className="text-xs font-bold uppercase tracking-widest text-gray-400 mb-2">Data</p><div className="rounded-2xl bg-white border border-purple-100 overflow-hidden"><div className="flex gap-3 items-center p-4 border-b border-purple-50"><span className="p-2 rounded-xl bg-purple-50 text-[#7548D8]"><Database size={18} /></span><span><strong className="block">Firebase sync</strong><small className="text-gray-500">Connected · {purchaseEvents.length} recorded check-offs</small></span></div><div className="flex gap-3 items-center p-4"><span className="p-2 rounded-xl bg-purple-50 text-[#7548D8]"><ShoppingBag size={18} /></span><span><strong className="block">Library</strong><small className="text-gray-500">{items.length} items · {recipes.length} recipes</small></span></div></div></section>
      <section><p className="text-xs font-bold uppercase tracking-widest text-gray-400 mb-2">Danger Zone</p><div className="rounded-2xl bg-white border border-red-100 overflow-hidden">{availableYears.map(year => <button key={year} onClick={() => setDeleteYear(year)} className="w-full flex gap-3 items-center p-4 text-left border-b last:border-0 border-red-50"><span className="p-2 rounded-xl bg-red-50 text-red-600"><Trash2 size={18} /></span><span className="flex-1"><strong className="block text-red-700">Delete {year} shopping data</strong><small className="text-gray-500">Removes checked-off items and analytics for this year</small></span><ChevronRight size={18} className="text-red-300" /></button>)}</div></section>
    </div>
  );

  const renderShoppingListView = () => (
    <div className="space-y-4 pb-24 animate-in fade-in zoom-in-95 duration-300">
      {/* Display Filtered Shopping List */}
      {filteredShoppingList.length === 0 ? (
        <div className="text-center py-12 text-gray-400">
          {shoppingList.length === 0 ? (
            <>
              <ShoppingCart size={48} className="mx-auto mb-2 opacity-50" />
              <p>Your list is empty.</p>
              <p className="text-sm">Add items or check your recipes!</p>
            </>
          ) : (
            <p>No items found.</p>
          )}
        </div>
      ) : (
        <div className="space-y-6">
          {DEFAULT_CATEGORIES.map(category => {
            const categoryItems = filteredShoppingList.filter(item => (item.category || 'other') === category.id);
            if (!categoryItems.length) return null;
            const CategoryIcon = category.icon;
            return <section key={category.id}><div className="flex items-center gap-2 mb-2"><span className="p-2 rounded-xl bg-purple-50 text-[#7548D8]"><CategoryIcon size={18} /></span><h2 className="font-bold text-gray-800 flex-1">{category.name}</h2><small className="text-gray-400">{categoryItems.length} {categoryItems.length === 1 ? 'item' : 'items'}</small></div><div className="rounded-2xl bg-white border border-purple-100 overflow-hidden">{categoryItems.map(item => (
            <div key={item.id} className="p-3 border-b last:border-0 border-purple-50 flex items-center justify-between group transition-all">
              <div className="flex items-center gap-3 flex-1 cursor-pointer" onClick={() => toggleItemStatus(item)}>
                <div className="w-6 h-6 rounded-full border-2 border-gray-300 flex items-center justify-center transition-colors hover:border-indigo-500 group-hover:border-indigo-400">
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <p className="font-medium text-gray-800">{item.name}</p>
                    <span className="text-xs font-bold text-[#7548D8] bg-purple-50 px-2 py-0.5 rounded-full">{formatQuantity(item)}</span>
                  </div>
                  <CategoryBadge categoryId={item.category} />
                </div>
              </div>
              <button
                onClick={() => deleteItem(item.id)}
                className="text-gray-300 hover:text-red-500 p-2 transition-colors active:scale-95"
              >
                <Trash2 size={18} />
              </button>
            </div>))}</div></section>})}
        </div>
      )}
      <button onClick={() => openAddItemModal()} className="fixed left-1/2 -translate-x-1/2 bottom-24 z-40 flex items-center gap-2 px-5 py-3 rounded-full bg-[#7548D8]/90 backdrop-blur-xl text-white font-bold shadow-xl border border-white/30"><Plus size={18} /> Add Item</button>
    </div>
  );

  const renderHistoryView = () => (
    <div className="space-y-4 pb-24 animate-in fade-in zoom-in-95 duration-300">
      <div className="grid grid-cols-3 gap-1 p-1 rounded-xl bg-purple-50">
        {[['all','All'],['week','This Week'],['month','This Month']].map(([id,label]) => <button key={id} onClick={() => setRecentFilter(id)} className={`py-2 rounded-lg text-xs font-bold transition-all ${recentFilter === id ? 'bg-white text-[#7548D8] shadow-sm' : 'text-gray-500'}`}>{label}</button>)}
      </div>
      {filteredHistory.length === 0 ? (
         <div className="text-center py-12 text-gray-400">
            {historyList.length === 0 ? (
                <>
                    <History size={48} className="mx-auto mb-2 opacity-50" />
                    <p>No history yet.</p>
                </>
            ) : (
                <p>No items found.</p>
            )}
         </div>
      ) : (
        <div className="space-y-2">
            {filteredHistory.map(item => (
                <div
                    key={item.id}
                    className="bg-gray-50 p-3 rounded-xl border border-gray-100 flex items-center justify-between opacity-75 hover:opacity-100 transition-all"
                >
                    <div className="flex items-center gap-3 flex-1">
                    <div className="line-through text-gray-500 font-medium">
                      {item.name} · {formatQuantity(item)}
                    </div>
                    <CategoryBadge categoryId={item.category} />
                    </div>
                    <button
                    onClick={() => addHistoryItemBack(item)}
                    className="text-indigo-600 bg-indigo-50 p-2 rounded-full hover:bg-indigo-100 transition-colors active:scale-95"
                    >
                    <Plus size={18} />
                    </button>
                </div>
            ))}
        </div>
      )}
    </div>
  );

  const renderRecipesView = () => (
    <div className="space-y-4 pb-24 animate-in fade-in zoom-in-95 duration-300">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {filteredRecipes.map(recipe => (
          <div
            key={recipe.id}
            onClick={() => setSelectedRecipe(recipe)}
            className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 hover:shadow-md transition-all cursor-pointer relative overflow-hidden group active:scale-[0.98]"
          >
            <div className="absolute top-0 right-0 p-2 group-hover:opacity-100 transition-opacity z-10">
               <ArrowRight size={16} className="text-gray-400" />
            </div>
            <button
              onClick={(e) => {
                e.stopPropagation();
                deleteRecipe(recipe.id);
              }}
              className="absolute top-2 right-2 p-1.5 bg-gray-100 rounded-full text-gray-400 hover:text-red-500 hover:bg-red-50 z-20 transition-colors opacity-0 group-hover:opacity-100"
            >
              <Trash2 size={14} />
            </button>
            <div className="flex items-center gap-3 mb-2">
              <div className="w-10 h-10 bg-emerald-100 rounded-full flex items-center justify-center text-emerald-700 shrink-0">
                <ChefHat size={20} />
              </div>
              <h3 className="font-bold text-gray-800 line-clamp-1 pr-6">{recipe.name}</h3>
            </div>
            <p className="text-sm text-gray-500">{recipe.ingredients.length} ingredients</p>
          </div>
        ))}
      </div>
      {filteredRecipes.length === 0 && (
         <div className="text-center py-12 text-gray-400">
           <Utensils size={48} className="mx-auto mb-2 opacity-50" />
           <p>No recipes found.</p>
           {recipes.length === 0 && <p className="text-sm">Create your first master dish!</p>}
         </div>
      )}
    </div>
  );

  const renderAnalyticsView = () => {
    const categoryCounts = historyList.reduce((acc, item) => {
      acc[item.category] = (acc[item.category] || 0) + 1;
      return acc;
    }, {});

    return (
      <div className="space-y-6 pb-24 animate-in fade-in zoom-in-95 duration-300">
        <section className="bg-white p-4 rounded-2xl shadow-sm border border-gray-100">
          <h2 className="font-bold text-gray-700 mb-3 flex items-center gap-2">
            <Calendar size={18} /> Next Meals
          </h2>
          <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-hide">
            {[0, 1, 2, 3].map(offset => {
               const date = new Date();
               date.setDate(date.getDate() + offset);
               const dayName = date.toLocaleDateString('en-US', { weekday: 'short' });
               const plannedMeal = mealPlan.find(m => new Date(m.date).toDateString() === date.toDateString());
               const recipeName = plannedMeal ? recipes.find(r => r.id === plannedMeal.recipeId)?.name : null;

               return (
                 <div key={offset} className="min-w-[130px] bg-indigo-50 p-3 rounded-xl flex flex-col justify-between h-28 relative group transition-transform hover:scale-[1.02]">
                   <div className="flex justify-between items-start">
                     <span className="text-xs font-bold text-indigo-400 uppercase">{dayName}</span>
                     {plannedMeal ? (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            deleteMeal(plannedMeal.id);
                          }}
                          className="bg-white text-red-400 rounded-full p-1 shadow-sm hover:bg-red-50 hover:text-red-600 relative z-10 transition-colors"
                        >
                          <X size={14} />
                        </button>
                     ) : (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setPlanningDayOffset(offset);
                            setMealSearchTerm(''); 
                            setIsSelectRecipeOpen(true);
                          }}
                          className="bg-white text-indigo-600 rounded-full p-1 shadow-sm hover:bg-indigo-100 relative z-10 transition-colors"
                        >
                         <Plus size={14} />
                        </button>
                     )}
                   </div>
                   {recipeName ? (
                     <div className="mt-2">
                        <span className="text-sm font-medium text-indigo-900 line-clamp-2 leading-tight">{recipeName}</span>
                        <div className="mt-1 flex items-center gap-1 text-[10px] text-indigo-500">
                          <Check size={10} /> List added
                        </div>
                     </div>
                   ) : (
                     <span className="text-xs text-indigo-300 mt-2 italic">Nothing planned</span>
                   )}
                 </div>
               );
            })}
          </div>
        </section>

        <section className="bg-white p-4 rounded-2xl shadow-sm border border-purple-100">
          <div className="flex items-center justify-between mb-4"><div><h2 className="font-bold text-gray-800">Shopping rhythm</h2><p className="text-sm text-gray-500">Calculated from item check-offs grouped into store trips</p></div><Clock3 size={20} className="text-[#7548D8]" /></div>
          {shoppingAnalytics.trips.length < 2 ? <div className="p-4 rounded-xl bg-purple-50 text-sm text-[#5d34ba]">Check off items after at least two shopping trips to calculate your rhythm.</div> : <div className="grid grid-cols-2 gap-3">
            <div className="p-3 rounded-xl bg-purple-50"><strong className="text-xl text-[#7548D8]">{shoppingAnalytics.averageDaysBetweenTrips.toFixed(1)} days</strong><small className="block text-gray-500">Between shopping trips</small></div>
            <div className="p-3 rounded-xl bg-purple-50"><strong className="text-xl text-[#7548D8]">{shoppingAnalytics.tripsThisMonth}</strong><small className="block text-gray-500">Trips this month</small></div>
            <div className="p-3 rounded-xl bg-purple-50"><strong className="text-xl text-[#7548D8]">{shoppingAnalytics.averageItemsPerTrip.toFixed(1)}</strong><small className="block text-gray-500">Items per trip</small></div>
            <div className="p-3 rounded-xl bg-purple-50"><strong className="text-xl text-[#7548D8]">{shoppingAnalytics.commonShoppingDay}</strong><small className="block text-gray-500">Most common day</small></div>
          </div>}
        </section>

        <section className="bg-gradient-to-br from-purple-600 to-indigo-700 p-6 rounded-2xl shadow-lg text-white relative overflow-hidden">
           <div className="absolute top-0 right-0 p-8 opacity-10 transform translate-x-4 -translate-y-4">
             <Award size={100} />
           </div>
           <h2 className="text-2xl font-bold mb-1">My Year in Groceries</h2>
           <p className="text-purple-200 text-sm mb-6">Your culinary journey highlights</p>
           
           <div className="bg-white/10 backdrop-blur-sm p-4 rounded-xl mb-6">
              <p className="text-xs text-purple-200 uppercase font-bold mb-2">My Top Items</p>
              <ul className="space-y-2">
                {topItems.map((item, idx) => (
                  <li key={item.id} className="flex justify-between items-center text-sm border-b border-white/10 pb-1 last:border-0 last:pb-0">
                    <span className="text-white/90 font-medium">{idx + 1}. {item.name}</span>
                    <span className="text-purple-200 bg-white/10 px-2 py-0.5 rounded-full text-xs">{item.buyCount}x</span>
                  </li>
                ))}
                {topItems.length === 0 && <li className="text-purple-300 text-xs italic">No items bought yet.</li>}
              </ul>
           </div>

           <div className="bg-white/5 backdrop-blur-sm rounded-xl p-4">
              <div className="flex items-center gap-2 mb-4 text-purple-200 text-xs font-semibold uppercase tracking-wider">
                  <Trophy size={14} className="text-yellow-400" /> Favorite Recipes
              </div>
              <div className="flex justify-center items-end gap-2 px-2 h-32">
                  <PodiumStep rank={2} recipe={topRecipes[1]} height="h-16" color="bg-purple-300/30" textColor="text-purple-100" />
                  <PodiumStep rank={1} recipe={topRecipes[0]} height="h-24" color="bg-yellow-400/40" textColor="text-yellow-100" />
                  <PodiumStep rank={3} recipe={topRecipes[2]} height="h-10" color="bg-indigo-300/30" textColor="text-indigo-100" />
              </div>
           </div>
        </section>

        <section className="bg-white p-4 rounded-2xl shadow-sm border border-gray-100">
          <h2 className="font-bold text-gray-700 mb-4 flex items-center gap-2">
            <PieChart size={18} /> Category Breakdown
          </h2>
          <div className="space-y-3">
             {Object.entries(categoryCounts).map(([catId, count]) => {
               const cat = DEFAULT_CATEGORIES.find(c => c.id === catId);
               const name = cat ? cat.name : catId;
               const colorClass = 'bg-[#7548D8]';
               const percentage = Math.round((count / historyList.length) * 100);
               return (
                 <div key={catId}>
                   <div className="flex justify-between text-sm mb-1">
                     <span className="text-gray-600 capitalize">{name}</span>
                     <span className="font-medium">{count} items ({percentage}%)</span>
                   </div>
                   <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                     <div className={`h-full ${colorClass}`} style={{ width: `${percentage}%` }} />
                   </div>
                 </div>
               )
             })}
             {historyList.length === 0 && <p className="text-gray-400 text-sm text-center">Start shopping to see analytics!</p>}
          </div>
        </section>
      </div>
    );
  };

  // --- Render ---

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 p-6">
        <div className="animate-pulse flex flex-col items-center max-w-xs text-center">
          <ChefHat size={48} className="text-indigo-600 mb-4" />
          
          {authError ? (
            <div className="space-y-2">
              <div className="flex items-center justify-center gap-2 text-red-500 font-bold">
                <AlertCircle size={20} />
                <span>Connection Issue</span>
              </div>
              <p className="text-gray-600 text-xs">{authError}</p>
              <div className="bg-yellow-50 text-yellow-800 text-[10px] p-2 rounded-lg mt-2 text-left">
                <strong>Vercel Setup:</strong> Please ensure your Firebase keys are set in your project environment variables or in the App.jsx file.
              </div>
            </div>
          ) : (
            <div className="space-y-2">
              <p className="text-gray-500 font-medium">Loading your kitchen...</p>
              {isLoadingLong && (
                <p className="text-xs text-gray-400 animate-fade-in">
                  Taking longer than usual... Check your internet or config.
                </p>
              )}
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <>
      <style>{`
        @supports (padding-bottom: env(safe-area-inset-bottom)) {
          .pb-safe {
             padding-bottom: env(safe-area-inset-bottom);
          }
        }
        /* Custom scrollbar hiding */
        .scrollbar-hide::-webkit-scrollbar {
            display: none;
        }
        .scrollbar-hide {
            -ms-overflow-style: none;
            scrollbar-width: none;
        }
        .custom-scrollbar::-webkit-scrollbar {
          width: 4px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: #d1d5db;
          border-radius: 4px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: transparent;
        }
      `}</style>
      {/* Outer Container for Full Viewport on Mobile using 100dvh for proper Safari support */}
      <div className="fixed inset-0 w-full h-[100dvh] bg-[#eee8e3] font-sans text-gray-900 flex justify-center items-center">
        {/* Mobile Device Simulation/Actual Container */}
        <div className="w-full max-w-md h-full bg-[#fffaf6] shadow-2xl relative flex flex-col overflow-hidden sm:rounded-[2rem] sm:h-[95vh] sm:border-[8px] sm:border-white/70">
          
          {/* Status Bar */}
          <div className="h-6 bg-white w-full shrink-0 sm:block hidden"></div>

          {/* Fixed Top Header (Outside ScrollView) */}
          {!['home','settings'].includes(activeTab) && <div className="px-4 pt-2 pb-2 bg-[#fffaf6] z-20 shrink-0 border-b border-purple-50">{renderHeader()}</div>}

          {/* Main Scrolling Area - Flex 1 takes available space, overflow handles scrolling */}
          <main className="flex-1 overflow-y-auto p-4 pt-2 pb-24 relative custom-scrollbar">
            {activeTab === 'home' && renderHomeView()}
            {activeTab === 'shopping' && renderShoppingListView()}
            {activeTab === 'recipes' && renderRecipesView()}
            {activeTab === 'history' && renderHistoryView()}
            {activeTab === 'analytics' && renderAnalyticsView()}
            {activeTab === 'settings' && renderSettingsView()}
          </main>

          {/* Fixed Navigation Bar */}
          {activeTab !== 'settings' && <nav className="absolute bottom-0 left-0 right-0 z-50">
            <div className="bg-white/95 backdrop-blur-2xl border-t border-slate-200 pb-safe transition-all shadow-[0_-5px_10px_rgba(0,0,0,0.02)]">
              <div className="flex justify-around items-center h-20 px-1 pb-2">
                <button onClick={() => setActiveTab('home')} className="flex-1 flex flex-col items-center justify-center group outline-none">
                  <div className={`px-3 py-1.5 rounded-full transition-all ${activeTab === 'home' ? 'bg-purple-100 text-[#7548D8]' : 'text-slate-400'}`}><Home size={22} /></div><span className={`text-[9px] font-semibold mt-1 ${activeTab === 'home' ? 'text-[#7548D8]' : 'text-slate-400'}`}>Home</span>
                </button>
                <button onClick={() => setActiveTab('shopping')} className="flex-1 flex flex-col items-center justify-center group outline-none">
                  <div className={`px-3 py-1.5 rounded-full transition-all duration-300 ease-in-out ${activeTab === 'shopping' ? 'bg-purple-100 text-[#7548D8]' : 'text-slate-400'}`}>
                    <ShoppingCart size={22} strokeWidth={activeTab === 'shopping' ? 2.5 : 2} />
                  </div>
                  <span className={`text-[9px] font-semibold mt-1 ${activeTab === 'shopping' ? 'text-[#7548D8]' : 'text-slate-400'}`}>List</span>
                </button>
                <button onClick={() => setActiveTab('recipes')} className="flex-1 flex flex-col items-center justify-center group outline-none">
                  <div className={`px-3 py-1.5 rounded-full transition-all duration-300 ease-in-out ${activeTab === 'recipes' ? 'bg-purple-100 text-[#7548D8]' : 'text-slate-400'}`}>
                    <ChefHat size={22} strokeWidth={activeTab === 'recipes' ? 2.5 : 2} />
                  </div>
                  <span className={`text-[9px] font-semibold mt-1 ${activeTab === 'recipes' ? 'text-[#7548D8]' : 'text-slate-400'}`}>Recipes</span>
                </button>
                <button onClick={() => setActiveTab('history')} className="flex-1 flex flex-col items-center justify-center group outline-none">
                   <div className={`px-5 py-1.5 rounded-full transition-all duration-300 ease-in-out ${activeTab === 'history' ? 'bg-indigo-100 text-indigo-600 translate-y-0' : 'text-slate-400 group-hover:bg-slate-100 group-active:scale-95'}`}>
                    <RefreshCw size={24} strokeWidth={activeTab === 'history' ? 2.5 : 2} />
                  </div>
                  <span className={`text-[10px] font-semibold mt-1 transition-all duration-300 ${activeTab === 'history' ? 'text-indigo-600' : 'text-slate-400'}`}>Recent</span>
                </button>
                <button onClick={() => setActiveTab('analytics')} className="flex-1 flex flex-col items-center justify-center group outline-none">
                  <div className={`px-5 py-1.5 rounded-full transition-all duration-300 ease-in-out ${activeTab === 'analytics' ? 'bg-indigo-100 text-indigo-600 translate-y-0' : 'text-slate-400 group-hover:bg-slate-100 group-active:scale-95'}`}>
                    <PieChart size={24} strokeWidth={activeTab === 'analytics' ? 2.5 : 2} />
                  </div>
                  <span className={`text-[10px] font-semibold mt-1 transition-all duration-300 ${activeTab === 'analytics' ? 'text-indigo-600' : 'text-slate-400'}`}>Plan</span>
                </button>
              </div>
            </div>
          </nav>}

          <Modal isOpen={isAddItemOpen} onClose={closeAddItemModal} title={selectedItem ? 'Add Recent Item' : 'Add Item'} bottomSheet>
            <div className="space-y-4">
              <label className="block text-xs font-bold uppercase tracking-wider text-gray-500">Item name<span className="relative block mt-2"><input name="grocery-item-query" autoComplete="new-password" autoCorrect="off" autoCapitalize="sentences" spellCheck="false" value={newItemName} onChange={(event) => handleNewItemNameChange(event.target.value)} placeholder="Start typing…" className="w-full bg-stone-100 p-3.5 pr-11 rounded-2xl text-base normal-case tracking-normal font-medium outline-none focus:ring-2 focus:ring-purple-200" />{newItemName && <button type="button" aria-label="Clear item name" onClick={() => handleNewItemNameChange('')} className="absolute right-2 top-1/2 -translate-y-1/2 p-2 rounded-full text-gray-400 hover:text-gray-700"><X size={17} /></button>}</span></label>
              {recentItemSuggestions.length > 0 && <div className="rounded-2xl border border-purple-100 overflow-hidden">{recentItemSuggestions.map(item => <button key={item.id} onClick={() => { setSelectedItemId(item.id); setNewItemName(item.name); setNewItemCategory(item.category || 'other'); }} className="w-full p-3 flex items-center gap-3 text-left border-b last:border-0 border-purple-50"><CategoryBadge categoryId={item.category} /><strong className="flex-1">{item.name}</strong><small className="text-gray-400">Recent</small></button>)}</div>}
              {effectiveItemMatch && <div className="p-3 rounded-2xl bg-purple-50 text-[#5d34ba] text-sm flex gap-2"><Check size={17} /> Matched with your item library · {DEFAULT_CATEGORIES.find(category => category.id === effectiveItemMatch.category)?.name || 'Other'}</div>}
              <div><p className="text-xs font-bold uppercase tracking-wider text-gray-500 mb-2">Quantity</p><div className="grid grid-cols-5 gap-2">{['1','500 g','1 kg','1 L'].map(preset => <button key={preset} onClick={() => { setQuantityPreset(preset); setCustomQuantityOpen(false); }} className={`py-3 rounded-xl text-xs font-bold border ${!customQuantityOpen && quantityPreset === preset ? 'bg-purple-50 text-[#7548D8] border-purple-300' : 'bg-stone-100 border-stone-200 text-gray-600'}`}>{preset}</button>)}<button onClick={() => setCustomQuantityOpen(true)} className={`grid place-items-center rounded-xl border ${customQuantityOpen ? 'bg-purple-50 text-[#7548D8] border-purple-300' : 'bg-stone-100 border-stone-200'}`}><MoreHorizontal size={18} /></button></div>
                {customQuantityOpen && <div className="mt-2 p-2 rounded-xl bg-stone-100 flex gap-2"><input inputMode="decimal" value={customQuantity} onChange={(event) => setCustomQuantity(event.target.value)} className="min-w-0 w-full px-3 rounded-lg" /><div className="flex">{['x','g','kg','ml','L'].map(unit => <button key={unit} onClick={() => setCustomUnit(unit)} className={`px-2 rounded-lg text-xs ${customUnit === unit ? 'bg-white text-[#7548D8] shadow-sm' : 'text-gray-500'}`}>{unit}</button>)}</div></div>}
              </div>
              {isNewItem && <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-purple-50 text-[#7548D8] text-xs font-bold"><Plus size={14} /> Add new item</div>}
              {isNewItem && <div><p className="text-xs font-bold uppercase tracking-wider text-gray-500 mb-2">Category</p><div className="grid grid-cols-3 gap-2">{allCategories.map(category => { const Icon = category.icon; return <button key={category.id} onClick={() => setNewItemCategory(category.id)} className={`min-h-20 p-2 rounded-2xl border text-[10px] flex flex-col items-center justify-center gap-1 ${newItemCategory === category.id ? 'bg-purple-100 text-[#7548D8] border-purple-300' : 'bg-white text-gray-600 border-purple-100'}`}><span className="p-2 rounded-xl bg-purple-50 text-[#7548D8]"><Icon size={18} /></span>{category.name}</button>})}</div></div>}
              {(effectiveItemMatch || isNewItem) && <button onClick={() => submitItem()} className="w-full bg-[#7548D8] text-white p-4 rounded-2xl font-bold shadow-lg shadow-purple-200">Save to Shopping List</button>}
            </div>
          </Modal>

          <Modal isOpen={isAddRecipeOpen} onClose={() => setIsAddRecipeOpen(false)} title="New Recipe">
             <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Recipe Name</label>
                <input type="text" value={newRecipeName} onChange={(e) => setNewRecipeName(e.target.value)} placeholder="e.g. Spaghetti Carbonara" className="w-full p-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none text-base" />
              </div>
              
              {/* New Dynamic Ingredient Inputs */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Ingredients</label>
                <div className="space-y-2">
                  {newRecipeIngredients.map((ing, index) => (
                    <div key={index} className="flex gap-2">
                      <input 
                        type="text"
                        value={ing.name}
                        onChange={(e) => updateNewRecipeIngredient(index, 'name', e.target.value)}
                        placeholder="Ingredient"
                        className="flex-1 min-w-0 bg-gray-50 p-2.5 rounded-lg border border-gray-200 focus:ring-2 focus:ring-indigo-500 outline-none text-base"
                      />
                      <select
                        value={ing.category}
                        onChange={(e) => updateNewRecipeIngredient(index, 'category', e.target.value)}
                        className="w-24 sm:w-32 bg-gray-50 p-2.5 rounded-lg border border-gray-200 focus:ring-2 focus:ring-indigo-500 outline-none text-sm"
                      >
                        <option value="other">Other</option>
                        {DEFAULT_CATEGORIES.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                      </select>
                      <button 
                        onClick={() => removeNewRecipeIngredientRow(index)}
                        className="p-2.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                      >
                        <X size={18} />
                      </button>
                    </div>
                  ))}
                </div>
                <button 
                  onClick={addNewRecipeIngredientRow}
                  className="mt-2 text-sm font-medium text-indigo-600 hover:text-indigo-700 flex items-center gap-1"
                >
                  <Plus size={16} /> Add Ingredient
                </button>
              </div>

               <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Instructions</label>
                <textarea value={newRecipeInstructions} onChange={(e) => setNewRecipeInstructions(e.target.value)} placeholder="1. Boil pasta..." rows={5} className="w-full p-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none resize-none text-base" />
              </div>
              <button onClick={addRecipe} className="w-full bg-indigo-600 text-white p-3 rounded-xl font-bold hover:bg-indigo-700 transition-colors">Save Recipe</button>
            </div>
          </Modal>

          <Modal isOpen={Boolean(deleteYear)} onClose={() => setDeleteYear(null)} title={`Delete ${deleteYear || ''} shopping data?`}>
            <div className="space-y-4">
              <div className="p-4 rounded-2xl bg-red-50 text-red-800 text-sm"><strong>This cannot be undone.</strong><p className="mt-1">All checked-off items and shopping analytics recorded for {deleteYear} will be deleted. Recipes and items still on your active shopping list will remain.</p></div>
              <div className="flex gap-2"><button onClick={() => setDeleteYear(null)} className="flex-1 p-3 rounded-xl bg-gray-100 font-bold text-gray-700">Cancel</button><button onClick={deleteYearData} className="flex-1 p-3 rounded-xl bg-red-600 font-bold text-white">Delete {deleteYear}</button></div>
            </div>
          </Modal>

          <Modal isOpen={!!selectedRecipe} onClose={() => setSelectedRecipe(null)} title={selectedRecipe?.name}>
             {selectedRecipe && (
                <RecipeDetailContent 
                  recipe={selectedRecipe} 
                  onClose={() => setSelectedRecipe(null)}
                  onUpdate={updateRecipe}
                  onAddIngredients={addRecipeToShoppingList}
                />
             )}
          </Modal>

          <Modal isOpen={isSelectRecipeOpen} onClose={() => setIsSelectRecipeOpen(false)} title="Select Meal">
            <div className="space-y-3">
               <p className="text-sm text-gray-500">This will add the meal to your plan and ingredients to your list.</p>
               
               {/* Search Bar for Select Meal */}
               <div className="relative mb-2">
                  <Search className="absolute left-3 top-3 text-gray-400" size={18} />
                  <input 
                    autoFocus
                    type="text" 
                    placeholder="Search available recipes..." 
                    value={mealSearchTerm}
                    onChange={(e) => setMealSearchTerm(e.target.value)}
                    className="w-full bg-gray-50 pl-10 pr-10 py-2.5 rounded-xl font-medium outline-none focus:ring-2 ring-indigo-100 border border-transparent focus:border-indigo-200 transition-all text-base"
                  />
                  {mealSearchTerm && (
                    <button 
                      onClick={() => setMealSearchTerm('')} 
                      className="absolute right-3 top-3 text-gray-400 hover:text-gray-600"
                    >
                      <X size={18} />
                    </button>
                  )}
               </div>

               {/* Filtered List Logic */}
               {(() => {
                 const filteredMealRecipes = recipes.filter(r => r.name.toLowerCase().includes(mealSearchTerm.toLowerCase()));
                 
                 if (filteredMealRecipes.length === 0) {
                   return <div className="text-center py-8 text-gray-400">No recipes match "{mealSearchTerm}".</div>;
                 }

                 return filteredMealRecipes.map(recipe => (
                   <button key={recipe.id} onClick={() => { planMeal(recipe, planningDayOffset); setIsSelectRecipeOpen(false); }} className="w-full text-left p-4 rounded-xl bg-gray-50 hover:bg-indigo-50 border border-transparent hover:border-indigo-200 transition-all group active:scale-[0.98]">
                     <div className="flex justify-between items-center">
                       <span className="font-bold text-gray-700 group-hover:text-indigo-700">{recipe.name}</span>
                       <CalendarPlus size={18} className="text-gray-300 group-hover:text-indigo-500" />
                     </div>
                     <span className="text-xs text-gray-400">{recipe.ingredients.length} ingredients</span>
                   </button>
                 ));
               })()}
            </div>
          </Modal>
        </div>
      </div>
    </>
  );
}
