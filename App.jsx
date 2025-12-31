import React, { useState, useEffect, useMemo } from 'react';
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
  Search
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
  serverTimestamp
} from 'firebase/firestore';

// --- Firebase Configuration ---
const firebaseConfig = typeof __firebase_config !== 'undefined' 
  ? JSON.parse(__firebase_config) 
  : { apiKey: "demo-key", projectId: "demo-project" };

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

const appId = typeof __app_id !== 'undefined' ? __app_id : 'default-app-id';

// --- Constants ---
const DEFAULT_CATEGORIES = [
  { id: 'veggies', name: 'Veggies & Fruits', color: 'bg-green-100 text-green-800' },
  { id: 'dairy', name: 'Dairy & Eggs', color: 'bg-yellow-100 text-yellow-800' },
  { id: 'meat', name: 'Meat & Fish', color: 'bg-red-100 text-red-800' },
  { id: 'pasta', name: 'Pasta & Rice', color: 'bg-orange-100 text-orange-800' },
  { id: 'sweets', name: 'Sweets & Snacks', color: 'bg-pink-100 text-pink-800' },
  { id: 'household', name: 'Household', color: 'bg-blue-100 text-blue-800' },
  { id: 'other', name: 'Other', color: 'bg-gray-100 text-gray-800' },
];

// --- Helper Components ---

const Modal = ({ isOpen, onClose, title, children }) => {
  if (!isOpen) return null;
  return (
    <div className="absolute inset-0 z-[100] flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white w-full h-[85%] sm:h-auto sm:max-w-sm sm:rounded-2xl rounded-t-2xl shadow-2xl flex flex-col animate-in slide-in-from-bottom duration-300">
        <div className="flex justify-between items-center p-4 border-b border-gray-100">
          <h2 className="text-lg font-bold text-gray-900 tracking-tight">{title}</h2>
          <button onClick={onClose} className="p-2 bg-gray-100 hover:bg-gray-200 rounded-full transition-colors">
            <X size={20} className="text-gray-600" />
          </button>
        </div>
        <div className="p-4 overflow-y-auto flex-1 pb-safe-modal custom-scrollbar">
          {children}
        </div>
      </div>
    </div>
  );
};

// Component to handle View/Edit logic for a single recipe
const RecipeDetailModalContent = ({ recipe, onClose, onUpdate, onAddIngredients }) => {
  const [isEditing, setIsEditing] = useState(false);
  const [editedName, setEditedName] = useState(recipe.name);
  const [editedIngredients, setEditedIngredients] = useState(recipe.ingredients.map(i => i.name).join('\n'));
  const [editedInstructions, setEditedInstructions] = useState(recipe.instructions || '');

  const handleSave = () => {
    const ingredientsList = editedIngredients.split('\n').filter(l => l.trim().length > 0).map(l => ({ name: l.trim(), isDone: false }));
    onUpdate(recipe.id, {
      name: editedName,
      ingredients: ingredientsList,
      instructions: editedInstructions
    });
    setIsEditing(false);
  };

  if (isEditing) {
    return (
      <div className="space-y-4">
        <div>
          <label className="text-xs font-bold text-gray-500 uppercase">Recipe Name</label>
          <input 
            type="text" 
            value={editedName} 
            onChange={(e) => setEditedName(e.target.value)} 
            className="w-full bg-gray-100 p-3 rounded-xl outline-none font-bold mt-1 focus:ring-2 ring-blue-500"
          />
        </div>
        <div>
          <label className="text-xs font-bold text-gray-500 uppercase">Ingredients (one per line)</label>
          <textarea 
            value={editedIngredients} 
            onChange={(e) => setEditedIngredients(e.target.value)} 
            className="w-full bg-gray-100 p-3 rounded-xl outline-none h-32 resize-none mt-1 focus:ring-2 ring-blue-500 font-mono text-sm" 
          />
        </div>
        <div>
          <label className="text-xs font-bold text-gray-500 uppercase">Instructions</label>
          <textarea 
            value={editedInstructions} 
            onChange={(e) => setEditedInstructions(e.target.value)} 
            className="w-full bg-gray-100 p-3 rounded-xl outline-none h-32 resize-none mt-1 focus:ring-2 ring-blue-500 text-sm" 
          />
        </div>
        <div className="flex gap-2 pt-2">
          <button onClick={() => setIsEditing(false)} className="flex-1 bg-gray-100 text-gray-700 p-3 rounded-xl font-bold">Cancel</button>
          <button onClick={handleSave} className="flex-1 bg-blue-600 text-white p-3 rounded-xl font-bold flex items-center justify-center gap-2">
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
          className="flex items-center gap-1 text-sm font-medium text-blue-600 bg-blue-50 px-3 py-1.5 rounded-lg hover:bg-blue-100 transition-colors"
        >
          <Edit2 size={14} /> Edit Recipe
        </button>
      </div>

      <div className="bg-gray-50 p-4 rounded-2xl">
         <h4 className="font-semibold text-gray-500 text-sm uppercase tracking-wide mb-3">Ingredients</h4>
         <ul className="space-y-3">
           {recipe.ingredients.map((ing, i) => (
              <li key={i} className="flex items-start gap-3 text-gray-800">
                <div className="w-1.5 h-1.5 bg-blue-400 rounded-full mt-2 shrink-0"></div> 
                <span className="leading-tight">{ing.name}</span>
              </li>
           ))}
         </ul>
      </div>

      {recipe.instructions && (
        <div>
           <h4 className="font-semibold text-gray-500 text-sm uppercase tracking-wide mb-2">Instructions</h4>
           <p className="text-gray-700 whitespace-pre-wrap leading-relaxed">{recipe.instructions}</p>
        </div>
      )}

      <button onClick={() => { onAddIngredients(recipe); onClose(); }} className="w-full bg-blue-600 text-white p-4 rounded-xl font-bold text-lg active:scale-95 transition-transform shadow-lg shadow-blue-200">
        Add Ingredients to List
      </button>
    </div>
  );
};

const CategoryBadge = ({ categoryId }) => {
  const defaultCat = DEFAULT_CATEGORIES.find(c => c.id === categoryId);
  const label = defaultCat ? defaultCat.name : categoryId;
  const colorClass = defaultCat ? defaultCat.color : 'bg-indigo-50 text-indigo-700 border border-indigo-100';

  return (
    <span className={`text-[10px] uppercase tracking-wide px-2 py-0.5 rounded-md font-bold ${colorClass} truncate max-w-[100px] inline-block align-middle`}>
      {label}
    </span>
  );
};

// --- Main App Logic ---

function AppContent({ user, activeTab, setActiveTab }) {
  // Data State
  const [items, setItems] = useState([]);
  const [recipes, setRecipes] = useState([]);
  const [mealPlan, setMealPlan] = useState([]);
  
  // UI State
  const [isAddItemOpen, setIsAddItemOpen] = useState(false);
  const [isAddRecipeOpen, setIsAddRecipeOpen] = useState(false);
  const [selectedRecipe, setSelectedRecipe] = useState(null);
  
  // Search State
  const [recipeSearchTerm, setRecipeSearchTerm] = useState('');

  // Form State
  const [newItemName, setNewItemName] = useState('');
  const [newItemCategory, setNewItemCategory] = useState('other');
  
  const [newRecipeName, setNewRecipeName] = useState('');
  const [newRecipeIngredients, setNewRecipeIngredients] = useState(''); 
  const [newRecipeInstructions, setNewRecipeInstructions] = useState('');

  // --- Data Sync ---
  useEffect(() => {
    if (!user) return;

    const itemsRef = collection(db, 'artifacts', appId, 'public', 'data', 'items');
    const recipesRef = collection(db, 'artifacts', appId, 'public', 'data', 'recipes');
    const mealsRef = collection(db, 'artifacts', appId, 'public', 'data', 'meals');

    const unsubItems = onSnapshot(itemsRef, (snapshot) => {
      const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setItems(data);
    });
    const unsubRecipes = onSnapshot(recipesRef, (snapshot) => {
      const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setRecipes(data);
    });
    const unsubMeals = onSnapshot(mealsRef, (snapshot) => {
      const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setMealPlan(data);
    });

    return () => { unsubItems(); unsubRecipes(); unsubMeals(); };
  }, [user]);

  // --- Derived State & Actions ---
  const shoppingList = useMemo(() => items.filter(i => !i.isBought).sort((a,b) => b.createdAt?.seconds - a.createdAt?.seconds), [items]);
  const historyList = useMemo(() => items.filter(i => i.isBought).sort((a,b) => b.boughtAt?.seconds - a.boughtAt?.seconds), [items]);
  
  const filteredRecipes = useMemo(() => {
    if (!recipeSearchTerm) return recipes;
    return recipes.filter(r => r.name.toLowerCase().includes(recipeSearchTerm.toLowerCase()));
  }, [recipes, recipeSearchTerm]);

  const allCategories = useMemo(() => {
    const customSet = new Set();
    items.forEach(i => { if (!DEFAULT_CATEGORIES.find(c => c.id === i.category)) customSet.add(i.category); });
    if (newItemCategory && !DEFAULT_CATEGORIES.find(c => c.id === newItemCategory)) customSet.add(newItemCategory);
    return [...DEFAULT_CATEGORIES, ...Array.from(customSet).map(name => ({ id: name, name: name, color: 'bg-indigo-50 text-indigo-700 border border-indigo-100' }))];
  }, [items, newItemCategory]);

  const addItem = async (name, category = 'other') => {
    if (!name.trim() || !user) return;
    await addDoc(collection(db, 'artifacts', appId, 'public', 'data', 'items'), { name: name.trim(), category, isBought: false, createdAt: serverTimestamp(), buyCount: 1 });
    setNewItemName('');
  };

  const toggleItemStatus = async (item) => {
    if (!user) return;
    const docRef = doc(db, 'artifacts', appId, 'public', 'data', 'items', item.id);
    await updateDoc(docRef, { isBought: !item.isBought, boughtAt: !item.isBought ? serverTimestamp() : null, buyCount: !item.isBought ? (item.buyCount || 0) + 1 : item.buyCount });
  };

  const deleteItem = async (id) => deleteDoc(doc(db, 'artifacts', appId, 'public', 'data', 'items', id));
  
  const deleteRecipe = async (id) => { 
    if (window.confirm("Delete recipe?")) {
      deleteDoc(doc(db, 'artifacts', appId, 'public', 'data', 'recipes', id));
      if (selectedRecipe?.id === id) setSelectedRecipe(null);
    }
  };

  const updateRecipe = async (id, updatedData) => {
    const docRef = doc(db, 'artifacts', appId, 'public', 'data', 'recipes', id);
    await updateDoc(docRef, updatedData);
    // Update local selection if needed
    setSelectedRecipe({ ...selectedRecipe, ...updatedData });
  };
  
  const addRecipe = async () => {
    if (!newRecipeName.trim() || !user) return;
    const ingredientsList = newRecipeIngredients.split('\n').filter(l => l.trim().length > 0).map(l => ({ name: l.trim(), isDone: false }));
    await addDoc(collection(db, 'artifacts', appId, 'public', 'data', 'recipes'), { 
      name: newRecipeName.trim(), 
      ingredients: ingredientsList, 
      instructions: newRecipeInstructions, 
      createdAt: serverTimestamp() 
    });
    setIsAddRecipeOpen(false); setNewRecipeName(''); setNewRecipeIngredients(''); setNewRecipeInstructions('');
  };

  const addRecipeToShoppingList = async (recipe) => {
    await Promise.all(recipe.ingredients.map(ing => addItem(ing.name, 'other')));
    alert("Ingredients added!");
  };

  // --- Views ---
  const ShoppingListView = () => (
    <div className="space-y-4 pb-4">
      <div className="flex justify-between items-center px-1">
        <h1 className="text-3xl font-bold text-gray-900 tracking-tight">Grocery List</h1>
        <button onClick={() => setIsAddItemOpen(true)} className="bg-blue-600 text-white p-2.5 rounded-full shadow-lg hover:bg-blue-700 active:scale-90 transition-all"><Plus size={24} /></button>
      </div>
      {shoppingList.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-gray-400">
          <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mb-4"><ShoppingCart size={32} /></div>
          <p className="font-medium">All caught up!</p>
        </div>
      ) : (
        <div className="space-y-2">
          {shoppingList.map(item => (
            <div key={item.id} className="bg-white p-3.5 rounded-2xl shadow-[0_2px_8px_rgba(0,0,0,0.04)] border border-gray-100 flex items-center justify-between group active:scale-[0.99] transition-transform duration-100">
              <div className="flex items-center gap-4 flex-1 cursor-pointer" onClick={() => toggleItemStatus(item)}>
                <div className="w-6 h-6 rounded-full border-[2.5px] border-gray-300 flex items-center justify-center"></div>
                <div>
                  <p className="font-semibold text-gray-900 text-[17px] leading-snug">{item.name}</p>
                  <CategoryBadge categoryId={item.category} />
                </div>
              </div>
              <button onClick={() => deleteItem(item.id)} className="text-gray-300 p-2"><Trash2 size={18} /></button>
            </div>
          ))}
        </div>
      )}
    </div>
  );

  const RecipesView = () => (
    <div className="space-y-4 pb-4">
      <div className="flex flex-col gap-4">
        <div className="flex justify-between items-center px-1">
          <h1 className="text-3xl font-bold text-gray-900 tracking-tight">Recipes</h1>
          <button onClick={() => setIsAddRecipeOpen(true)} className="bg-blue-600 text-white p-2.5 rounded-full shadow-lg active:scale-90 transition-all"><Plus size={24} /></button>
        </div>
        
        {/* Search Bar */}
        <div className="relative">
          <Search className="absolute left-3 top-3 text-gray-400" size={20} />
          <input 
            type="text" 
            placeholder="Search recipes..." 
            value={recipeSearchTerm}
            onChange={(e) => setRecipeSearchTerm(e.target.value)}
            className="w-full bg-white pl-10 pr-4 py-3 rounded-xl border border-gray-200 focus:border-blue-500 focus:ring-2 ring-blue-100 outline-none transition-all shadow-sm"
          />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        {filteredRecipes.map(recipe => (
          <div key={recipe.id} onClick={() => setSelectedRecipe(recipe)} className="bg-white p-4 rounded-2xl shadow-sm border border-gray-100 active:scale-95 transition-all cursor-pointer h-36 flex flex-col justify-between relative overflow-hidden">
            <div className="absolute -right-2 -bottom-2 opacity-5 text-gray-900"><ChefHat size={64} /></div>
            <div className="flex justify-between items-start">
              <div className="w-8 h-8 bg-orange-100 rounded-full flex items-center justify-center text-orange-600"><ChefHat size={16} /></div>
              <button onClick={(e) => { e.stopPropagation(); deleteRecipe(recipe.id); }} className="text-gray-300 hover:text-red-500 z-10 p-1"><Trash2 size={14} /></button>
            </div>
            <div>
              <h3 className="font-bold text-gray-900 leading-tight line-clamp-2">{recipe.name}</h3>
              <p className="text-xs text-gray-500 mt-1">{recipe.ingredients.length} items</p>
            </div>
          </div>
        ))}
        {filteredRecipes.length === 0 && (
          <div className="col-span-2 py-10 text-center text-gray-400">
            <p>No recipes found.</p>
          </div>
        )}
      </div>
    </div>
  );

  const HistoryView = () => (
    <div className="space-y-4 pb-4">
      <h1 className="text-3xl font-bold text-gray-900 tracking-tight px-1">History</h1>
      <p className="text-gray-500 px-1">Items you've bought recently.</p>
      
      {historyList.length === 0 ? (
        <div className="text-center py-20 text-gray-400">
          <History size={48} className="mx-auto mb-4 opacity-20" />
          <p>No history yet.</p>
        </div>
      ) : (
        <div className="space-y-2">
          {historyList.map(item => (
            <div key={item.id} className="bg-white p-3.5 rounded-2xl border border-gray-100 opacity-60">
              <div className="flex items-center gap-3">
                <Check size={16} className="text-green-500" />
                <span className="font-medium text-gray-700 line-through">{item.name}</span>
                <span className="ml-auto text-xs text-gray-400">
                  {item.boughtAt?.toDate ? item.boughtAt.toDate().toLocaleDateString() : 'Just now'}
                </span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );

  // --- Main Layout ---
  return (
    <div className="flex flex-col h-full bg-gray-50/50">
      <main className="flex-1 overflow-y-auto p-4 pt-14 pb-32 scrollbar-hide custom-scrollbar">
        {activeTab === 'shopping' && <ShoppingListView />}
        {activeTab === 'recipes' && <RecipesView />}
        {activeTab === 'history' && <HistoryView />}
        {activeTab === 'analytics' && <div className="p-4 text-center text-gray-500">Analytics feature coming soon</div>}
      </main>

      {/* iOS Style Tab Bar */}
      <nav className="absolute bottom-0 w-full bg-white/90 backdrop-blur-xl border-t border-gray-200 pb-safe z-50">
        <div className="flex justify-around items-center h-[55px] sm:h-[65px] px-2 pb-1">
          {[
            { id: 'recipes', icon: ChefHat, label: 'Recipes' },
            { id: 'shopping', icon: ShoppingCart, label: 'List' },
            { id: 'history', icon: History, label: 'History' },
            { id: 'analytics', icon: PieChart, label: 'Plan' }
          ].map(tab => (
            <button key={tab.id} onClick={() => setActiveTab(tab.id)} className="flex-1 flex flex-col items-center justify-center active:scale-90 transition-transform">
               <tab.icon size={26} strokeWidth={activeTab === tab.id ? 2.5 : 2} className={activeTab === tab.id ? "text-blue-600" : "text-gray-400"} />
               <span className={`text-[10px] font-medium mt-0.5 ${activeTab === tab.id ? "text-blue-600" : "text-gray-400"}`}>{tab.label}</span>
            </button>
          ))}
        </div>
      </nav>

      {/* Modals */}
      <Modal isOpen={isAddItemOpen} onClose={() => setIsAddItemOpen(false)} title="New Item">
         <div className="flex gap-2 mb-4">
           <input autoFocus type="text" value={newItemName} onChange={e => setNewItemName(e.target.value)} placeholder="What do you need?" className="flex-1 bg-gray-100 p-3 rounded-xl outline-none font-medium" />
         </div>
         <div className="grid grid-cols-2 gap-2 mb-4">
             {allCategories.map(cat => (
                <button key={cat.id} onClick={() => setNewItemCategory(cat.id)} className={`p-2.5 rounded-xl text-left text-sm font-medium transition-all ${newItemCategory === cat.id ? 'bg-blue-100 text-blue-800 ring-2 ring-blue-500' : 'bg-gray-50 text-gray-600'}`}>
                  {cat.name}
                </button>
             ))}
         </div>
         <button onClick={() => { addItem(newItemName, newItemCategory); setIsAddItemOpen(false); }} className="w-full bg-blue-600 text-white p-4 rounded-xl font-bold text-lg active:scale-95 transition-transform">Add Item</button>
      </Modal>

      <Modal isOpen={isAddRecipeOpen} onClose={() => setIsAddRecipeOpen(false)} title="New Recipe">
         <div className="space-y-4">
            <input type="text" value={newRecipeName} onChange={e => setNewRecipeName(e.target.value)} placeholder="Recipe Name" className="w-full bg-gray-100 p-3 rounded-xl outline-none font-bold" />
            <textarea value={newRecipeIngredients} onChange={e => setNewRecipeIngredients(e.target.value)} placeholder="Ingredients (one per line)" className="w-full bg-gray-100 p-3 rounded-xl outline-none h-32 resize-none" />
            <textarea value={newRecipeInstructions} onChange={e => setNewRecipeInstructions(e.target.value)} placeholder="Instructions" className="w-full bg-gray-100 p-3 rounded-xl outline-none h-32 resize-none" />
            <button onClick={addRecipe} className="w-full bg-blue-600 text-white p-4 rounded-xl font-bold text-lg active:scale-95 transition-transform">Save Recipe</button>
         </div>
      </Modal>

      <Modal isOpen={!!selectedRecipe} onClose={() => setSelectedRecipe(null)} title={selectedRecipe?.name || 'Recipe'}>
         {selectedRecipe && (
           <RecipeDetailModalContent 
             recipe={selectedRecipe} 
             onClose={() => setSelectedRecipe(null)} 
             onUpdate={updateRecipe}
             onAddIngredients={addRecipeToShoppingList}
           />
         )}
      </Modal>
    </div>
  );
}

// --- Responsive Wrapper (iPhone Simulator) ---

export default function App() {
  const [user, setUser] = useState(null);
  const [activeTab, setActiveTab] = useState('shopping');
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    // Auth
    const initAuth = async () => {
      if (typeof __initial_auth_token !== 'undefined' && __initial_auth_token) {
        await signInWithCustomToken(auth, __initial_auth_token);
      } else {
        await signInAnonymously(auth);
      }
    };
    initAuth();
    return onAuthStateChanged(auth, setUser);
  }, []);

  useEffect(() => {
    // Check if we are running on a real small screen
    const checkMobile = () => setIsMobile(window.innerWidth < 640);
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  const content = <AppContent user={user} activeTab={activeTab} setActiveTab={setActiveTab} />;

  if (!user) return <div className="h-screen flex items-center justify-center bg-gray-50"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div></div>;

  // Render Full Screen on Mobile Devices
  if (isMobile) {
    return (
      <div className="h-screen w-full font-[-apple-system,BlinkMacSystemFont,'Segoe_UI',Roboto,Helvetica,Arial,sans-serif] bg-white overflow-hidden">
        <style>{`.pb-safe { padding-bottom: env(safe-area-inset-bottom); } .pb-safe-modal { padding-bottom: calc(20px + env(safe-area-inset-bottom)); } .custom-scrollbar::-webkit-scrollbar { display: none; }`}</style>
        {content}
      </div>
    );
  }

  // Render iPhone Simulator on Desktop
  return (
    <div className="min-h-screen bg-[#1c1c1e] flex items-center justify-center p-8 font-sans">
       <style>{`
         .no-scrollbar::-webkit-scrollbar { display: none; }
         .no-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
         .pb-safe { padding-bottom: 20px; } 
         .pb-safe-modal { padding-bottom: 20px; }
         .custom-scrollbar::-webkit-scrollbar { width: 4px; }
         .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
         .custom-scrollbar::-webkit-scrollbar-thumb { background: #e5e7eb; border-radius: 4px; }
       `}</style>
      
      {/* Phone Bezel */}
      <div className="relative w-[375px] h-[812px] bg-white rounded-[50px] shadow-[0_0_0_12px_#3a3a3c,0_0_0_14px_#000,0_20px_50px_rgba(0,0,0,0.5)] overflow-hidden ring-1 ring-white/10">
        
        {/* Notch & Status Bar */}
        <div className="absolute top-0 inset-x-0 h-11 z-50 flex justify-between items-end px-6 pb-2 text-black font-semibold text-[13px] select-none pointer-events-none">
           <span className="ml-2">9:41</span>
           <div className="flex gap-1.5 items-center mr-2">
             <div className="w-4 h-2.5 bg-black rounded-[1px]"></div> {/* Battery Body */}
             <div className="w-0.5 h-1 bg-black rounded-r-[1px]"></div> {/* Battery Tip */}
           </div>
        </div>
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[160px] h-[32px] bg-black rounded-b-[20px] z-50"></div>

        {/* App Content Container */}
        <div className="h-full w-full relative bg-white overflow-hidden rounded-[40px]">
           {content}
        </div>

        {/* Home Indicator */}
        <div className="absolute bottom-2 left-1/2 -translate-x-1/2 w-[130px] h-[5px] bg-black rounded-full z-[100] pointer-events-none mix-blend-difference opacity-50"></div>
      </div>
    </div>
  );
}