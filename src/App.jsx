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
  Trophy
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
// NOTE: In a real VS Code project, you might put this config in a separate 'firebase.js' file.
// For this single-file code to work, we include it here.

const firebaseConfig = {
  apiKey: "AIzaSyClZXzh2kdD8pCbNaW6EDRUENERrIYOakU",
  authDomain: "our-grocery-app--muc-kitchen.firebaseapp.com",
  projectId: "our-grocery-app--muc-kitchen",
  storageBucket: "our-grocery-app--muc-kitchen.firebasestorage.app",
  messagingSenderId: "167242896960",
  appId: "1:167242896960:web:12ee5a8f54f78b496571a5"
};

// --- Initialize Firebase (Single Instance) ---
// BUG FIX 1: Removed duplicate imports and initialization
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

// --- App ID Definition ---
// BUG FIX 2: Defined the appId variable that was missing
const appId = "our-grocery-app--muc-kitchen"; 

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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 p-4 animate-in fade-in duration-200">
      <div className="bg-white rounded-2xl w-full max-w-md max-h-[90vh] overflow-y-auto shadow-xl flex flex-col">
        <div className="flex justify-between items-center p-4 border-b sticky top-0 bg-white z-10">
          <h2 className="text-xl font-bold text-gray-800">{title}</h2>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-full">
            <X size={20} />
          </button>
        </div>
        <div className="p-4 overflow-y-auto">
          {children}
        </div>
      </div>
    </div>
  );
};

const CategoryBadge = ({ categoryId }) => {
  const defaultCat = DEFAULT_CATEGORIES.find(c => c.id === categoryId);
  const label = defaultCat ? defaultCat.name : categoryId;
  const colorClass = defaultCat ? defaultCat.color : 'bg-indigo-50 text-indigo-700 border border-indigo-100';

  return (
    <span className={`text-xs px-2 py-1 rounded-full font-medium ${colorClass} truncate max-w-[120px] inline-block align-middle`}>
      {label}
    </span>
  );
};

const PodiumStep = ({ rank, recipe, height, color, textColor }) => (
  <div className="flex flex-col items-center justify-end group relative flex-1">
    {recipe && (
      <div className="absolute -top-8 bg-black/50 text-white text-[10px] py-1 px-2 rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap z-10">
        {recipe.count} times
      </div>
    )}
    <div className={`text-[10px] font-medium text-white/90 mb-1 text-center truncate w-full px-1 ${!recipe ? 'opacity-0' : ''}`}>
      {recipe ? recipe.name : '-'}
    </div>
    <div className={`w-full max-w-[60px] ${height} ${color} rounded-t-lg flex items-start justify-center pt-2 shadow-inner border-t border-white/10`}>
      <span className={`font-bold ${textColor} text-sm`}>{rank}</span>
    </div>
  </div>
);

// --- Main App Component ---

export default function App() {
  const [user, setUser] = useState(null);
  const [activeTab, setActiveTab] = useState('shopping'); 
  
  // Data State
  const [items, setItems] = useState([]);
  const [recipes, setRecipes] = useState([]);
  const [mealPlan, setMealPlan] = useState([]);
  
  // UI State
  const [isAddItemOpen, setIsAddItemOpen] = useState(false);
  const [isAddRecipeOpen, setIsAddRecipeOpen] = useState(false);
  const [selectedRecipe, setSelectedRecipe] = useState(null);
  const [isSelectRecipeOpen, setIsSelectRecipeOpen] = useState(false);
  const [planningDayOffset, setPlanningDayOffset] = useState(null);

  // Form State
  const [newItemName, setNewItemName] = useState('');
  const [newItemCategory, setNewItemCategory] = useState('other');
  const [isCreatingCategory, setIsCreatingCategory] = useState(false);
  const [customCategoryName, setCustomCategoryName] = useState('');
  
  const [newRecipeName, setNewRecipeName] = useState('');
  const [newRecipeIngredients, setNewRecipeIngredients] = useState(''); 
  const [newRecipeInstructions, setNewRecipeInstructions] = useState('');

  // --- Auth & Data Sync ---

  useEffect(() => {
    // BUG FIX 3: Simplified Auth for standard web app
    // In VS Code/Vercel, we don't have the __initial_auth_token from Canvas.
    // We try to sign in anonymously.
    const initAuth = async () => {
        try {
            await signInAnonymously(auth);
        } catch (error) {
            console.error("Auth failed:", error);
        }
    };
    initAuth();

    const unsubscribe = onAuthStateChanged(auth, setUser);
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    if (!user) return;

    // We use 'public' data path so the couple can share the list if they use the same App ID
    const itemsRef = collection(db, 'artifacts', appId, 'public', 'data', 'items');
    const recipesRef = collection(db, 'artifacts', appId, 'public', 'data', 'recipes');
    const mealsRef = collection(db, 'artifacts', appId, 'public', 'data', 'meals');

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

    return () => {
      unsubItems();
      unsubRecipes();
      unsubMeals();
    };
  }, [user]);

  // --- Derived State ---
  const shoppingList = useMemo(() => items.filter(i => !i.isBought).sort((a,b) => b.createdAt?.seconds - a.createdAt?.seconds), [items]);
  const historyList = useMemo(() => items.filter(i => i.isBought).sort((a,b) => b.boughtAt?.seconds - a.boughtAt?.seconds), [items]);
  
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

  const allCategories = useMemo(() => {
    const customSet = new Set();
    items.forEach(i => {
      if (!DEFAULT_CATEGORIES.find(c => c.id === i.category)) {
        customSet.add(i.category);
      }
    });

    if (newItemCategory && !DEFAULT_CATEGORIES.find(c => c.id === newItemCategory)) {
      customSet.add(newItemCategory);
    }

    const customCategories = Array.from(customSet).map(name => ({
      id: name,
      name: name,
      color: 'bg-indigo-50 text-indigo-700 border border-indigo-100'
    }));

    return [...DEFAULT_CATEGORIES, ...customCategories];
  }, [items, newItemCategory]);

  // --- Actions ---

  const addItem = async (name, category = 'other') => {
    if (!name.trim() || !user) return;
    try {
      await addDoc(collection(db, 'artifacts', appId, 'public', 'data', 'items'), {
        name: name.trim(),
        category,
        isBought: false,
        createdAt: serverTimestamp(),
        buyCount: 1
      });
      setNewItemName('');
    } catch (e) {
      console.error("Error adding item", e);
    }
  };

  const createCustomCategory = () => {
    if (customCategoryName.trim()) {
      setNewItemCategory(customCategoryName.trim());
      setIsCreatingCategory(false);
      setCustomCategoryName('');
    }
  };

  const toggleItemStatus = async (item) => {
    if (!user) return;
    try {
      const docRef = doc(db, 'artifacts', appId, 'public', 'data', 'items', item.id);
      await updateDoc(docRef, {
        isBought: !item.isBought,
        boughtAt: !item.isBought ? serverTimestamp() : null,
        buyCount: !item.isBought ? (item.buyCount || 0) + 1 : item.buyCount
      });
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

  const deleteMeal = async (id) => {
    if (!user) return;
    if (!window.confirm("Remove this meal from the plan?")) return;
    try {
      await deleteDoc(doc(db, 'artifacts', appId, 'public', 'data', 'meals', id));
    } catch (e) {
      console.error("Error deleting meal", e);
    }
  };

  const addRecipe = async () => {
    if (!newRecipeName.trim() || !user) return;
    
    const ingredientsList = newRecipeIngredients.split('\n').filter(line => line.trim().length > 0).map(line => ({
      name: line.trim(),
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
      setNewRecipeIngredients('');
      setNewRecipeInstructions('');
    } catch (e) {
      console.error("Error adding recipe", e);
    }
  };

  const addRecipeToShoppingList = async (recipe, showAlert = true) => {
    if (!user) return;
    const promises = recipe.ingredients.map(async (ing) => {
      await addItem(ing.name, 'other');
    });
    await Promise.all(promises);
    if (showAlert) alert(`Added ingredients for ${recipe.name} to list!`);
  };

  const addHistoryItemBack = async (item) => {
    if (!user) return;
    try {
      const docRef = doc(db, 'artifacts', appId, 'public', 'data', 'items', item.id);
      await updateDoc(docRef, {
        isBought: false,
        boughtAt: null
      });
    } catch (e) {
      console.error("Error moving history item back", e);
    }
  };

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
      
      await addRecipeToShoppingList(recipe, false);
      alert(`Planned ${recipe.name} for ${date.toLocaleDateString('en-US', {weekday: 'long'})} and added items to list!`);
    } catch(e) { console.error(e) }
  };

  // --- Render Views ---

  const ShoppingListView = () => (
    <div className="space-y-4 pb-24">
      <div className="flex justify-between items-center mb-4">
        <h1 className="text-2xl font-bold text-gray-800">Shopping List</h1>
        <button
          onClick={() => setIsAddItemOpen(true)}
          className="bg-indigo-600 text-white p-2 rounded-full shadow-lg hover:bg-indigo-700 active:scale-95 transition-all"
        >
          <Plus size={24} />
        </button>
      </div>

      {shoppingList.length === 0 ? (
        <div className="text-center py-12 text-gray-400">
          <ShoppingCart size={48} className="mx-auto mb-2 opacity-50" />
          <p>Your list is empty.</p>
          <p className="text-sm">Add items or check your recipes!</p>
        </div>
      ) : (
        <div className="space-y-2">
          {shoppingList.map(item => (
            <div
              key={item.id}
              className="bg-white p-3 rounded-xl shadow-sm border border-gray-100 flex items-center justify-between group animate-in slide-in-from-bottom-2 duration-200"
            >
              <div className="flex items-center gap-3 flex-1" onClick={() => toggleItemStatus(item)}>
                <div className="w-6 h-6 rounded-full border-2 border-gray-300 flex items-center justify-center cursor-pointer transition-colors hover:border-indigo-500">
                </div>
                <div>
                  <p className="font-medium text-gray-800">{item.name}</p>
                  <CategoryBadge categoryId={item.category} />
                </div>
              </div>
              <button
                onClick={() => deleteItem(item.id)}
                className="text-gray-300 hover:text-red-500 p-2 transition-colors"
              >
                <Trash2 size={18} />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );

  const HistoryView = () => (
    <div className="space-y-4 pb-24">
      <h1 className="text-2xl font-bold text-gray-800">Recently Bought</h1>
      <p className="text-sm text-gray-500">Tap + to add back to shopping list.</p>

      <div className="space-y-2">
        {historyList.map(item => (
          <div
            key={item.id}
            className="bg-gray-50 p-3 rounded-xl border border-gray-100 flex items-center justify-between opacity-75 hover:opacity-100 transition-opacity"
          >
            <div className="flex items-center gap-3 flex-1">
              <div className="line-through text-gray-500 font-medium">{item.name}</div>
              <CategoryBadge categoryId={item.category} />
            </div>
            <button
              onClick={() => addHistoryItemBack(item)}
              className="text-indigo-600 bg-indigo-50 p-2 rounded-full hover:bg-indigo-100 transition-colors"
            >
              <Plus size={18} />
            </button>
          </div>
        ))}
        {historyList.length === 0 && (
          <div className="text-center py-12 text-gray-400">
            <History size={48} className="mx-auto mb-2 opacity-50" />
            <p>No history yet.</p>
          </div>
        )}
      </div>
    </div>
  );

  const RecipesView = () => (
    <div className="space-y-4 pb-24">
      <div className="flex justify-between items-center mb-4">
        <h1 className="text-2xl font-bold text-gray-800">Our Recipes</h1>
        <button
          onClick={() => setIsAddRecipeOpen(true)}
          className="bg-indigo-600 text-white p-2 rounded-full shadow-lg hover:bg-indigo-700 active:scale-95 transition-all"
        >
          <Plus size={24} />
        </button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {recipes.map(recipe => (
          <div
            key={recipe.id}
            onClick={() => setSelectedRecipe(recipe)}
            className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 hover:shadow-md transition-all cursor-pointer relative overflow-hidden group"
          >
            <div className="absolute top-0 right-0 p-2 group-hover:opacity-100 transition-opacity z-10">
               <ArrowRight size={16} className="text-gray-400" />
            </div>
            <button
              onClick={(e) => {
                e.stopPropagation();
                deleteRecipe(recipe.id);
              }}
              className="absolute top-2 right-2 p-1.5 bg-gray-100 rounded-full text-gray-400 hover:text-red-500 hover:bg-red-50 z-20"
            >
              <Trash2 size={14} />
            </button>
            <div className="flex items-center gap-3 mb-2">
              <div className="w-10 h-10 bg-emerald-100 rounded-full flex items-center justify-center text-emerald-700">
                <ChefHat size={20} />
              </div>
              <h3 className="font-bold text-gray-800 line-clamp-1 pr-6">{recipe.name}</h3>
            </div>
            <p className="text-sm text-gray-500">{recipe.ingredients.length} ingredients</p>
          </div>
        ))}
      </div>
      {recipes.length === 0 && (
         <div className="text-center py-12 text-gray-400">
           <Utensils size={48} className="mx-auto mb-2 opacity-50" />
           <p>No recipes saved.</p>
           <p className="text-sm">Create your first master dish!</p>
         </div>
      )}
    </div>
  );

  const AnalyticsView = () => {
    const totalItems = historyList.length;
    const categoryCounts = historyList.reduce((acc, item) => {
      acc[item.category] = (acc[item.category] || 0) + 1;
      return acc;
    }, {});
    const topCategory = Object.entries(categoryCounts).sort((a,b) => b[1] - a[1])[0];

    return (
      <div className="space-y-6 pb-24">
        <h1 className="text-2xl font-bold text-gray-800">Analytics & Plan</h1>

        <section className="bg-white p-4 rounded-2xl shadow-sm border border-gray-100">
          <h2 className="font-bold text-gray-700 mb-3 flex items-center gap-2">
            <Calendar size={18} /> Next Meals
          </h2>
          <div className="flex gap-3 overflow-x-auto pb-2">
            {[0, 1, 2, 3].map(offset => {
               const date = new Date();
               date.setDate(date.getDate() + offset);
               const dayName = date.toLocaleDateString('en-US', { weekday: 'short' });
               const plannedMeal = mealPlan.find(m => new Date(m.date).toDateString() === date.toDateString());
               const recipeName = plannedMeal ? recipes.find(r => r.id === plannedMeal.recipeId)?.name : null;

               return (
                 <div key={offset} className="min-w-[130px] bg-indigo-50 p-3 rounded-xl flex flex-col justify-between h-28 relative group">
                   <div className="flex justify-between items-start">
                     <span className="text-xs font-bold text-indigo-400 uppercase">{dayName}</span>
                     {plannedMeal ? (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            deleteMeal(plannedMeal.id);
                          }}
                          className="bg-white text-red-400 rounded-full p-1 shadow-sm hover:bg-red-50 hover:text-red-600 relative z-10"
                        >
                          <X size={14} />
                        </button>
                     ) : (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setPlanningDayOffset(offset);
                            setIsSelectRecipeOpen(true);
                          }}
                          className="bg-white text-indigo-600 rounded-full p-1 shadow-sm hover:bg-indigo-100 relative z-10"
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

        <section className="bg-gradient-to-br from-purple-600 to-indigo-700 p-6 rounded-2xl shadow-lg text-white relative overflow-hidden">
           <div className="absolute top-0 right-0 p-8 opacity-10 transform translate-x-4 -translate-y-4">
             <Award size={100} />
           </div>
           <h2 className="text-2xl font-bold mb-1">My Year in Groceries</h2>
           <p className="text-purple-200 text-sm mb-6">Your culinary journey highlights</p>
           <div className="grid grid-cols-2 gap-4 mb-6">
              <div className="bg-white/10 backdrop-blur-sm p-3 rounded-lg">
                <p className="text-xs text-purple-200">Total Items</p>
                <p className="text-2xl font-bold">{totalItems}</p>
              </div>
              <div className="bg-white/10 backdrop-blur-sm p-3 rounded-lg">
                 <p className="text-xs text-purple-200">Top Category</p>
                 <p className="text-lg font-bold truncate">{topCategory ? DEFAULT_CATEGORIES.find(c => c.id === topCategory[0])?.name || topCategory[0] : '-'}</p>
              </div>
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
               const colorClass = cat ? cat.color.split(' ')[0].replace('text', 'bg') : 'bg-indigo-500';
               const percentage = Math.round((count / totalItems) * 100);
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
             {totalItems === 0 && <p className="text-gray-400 text-sm text-center">Start shopping to see analytics!</p>}
          </div>
        </section>
      </div>
    );
  };

  // --- Render ---

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="animate-pulse flex flex-col items-center">
          <ChefHat size={48} className="text-indigo-600 mb-4" />
          <p className="text-gray-500 font-medium">Loading your kitchen...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 font-sans text-gray-900 pb-safe">
      <div className="max-w-md mx-auto min-h-screen bg-white shadow-2xl relative">
        <main className="p-4 pt-8 h-full min-h-screen box-border">
          {activeTab === 'shopping' && <ShoppingListView />}
          {activeTab === 'recipes' && <RecipesView />}
          {activeTab === 'history' && <HistoryView />}
          {activeTab === 'analytics' && <AnalyticsView />}
        </main>

        <nav className="fixed bottom-0 left-0 right-0 z-50 max-w-md mx-auto">
          <div className="bg-slate-50/95 backdrop-blur-2xl border-t border-slate-200 pb-safe transition-all">
            <div className="flex justify-around items-center h-20 px-2 pb-2">
              <button onClick={() => setActiveTab('recipes')} className="flex-1 flex flex-col items-center justify-center group outline-none">
                <div className={`px-5 py-1.5 rounded-full transition-all duration-300 ease-in-out ${activeTab === 'recipes' ? 'bg-indigo-100 text-indigo-600 translate-y-0' : 'text-slate-400 group-hover:bg-slate-100 group-active:scale-95'}`}>
                  <ChefHat size={24} strokeWidth={activeTab === 'recipes' ? 2.5 : 2} />
                </div>
                <span className={`text-[10px] font-semibold mt-1 transition-all duration-300 ${activeTab === 'recipes' ? 'text-indigo-600' : 'text-slate-400'}`}>Recipes</span>
              </button>
              <button onClick={() => setActiveTab('shopping')} className="flex-1 flex flex-col items-center justify-center group outline-none">
                <div className={`px-5 py-1.5 rounded-full transition-all duration-300 ease-in-out ${activeTab === 'shopping' ? 'bg-indigo-100 text-indigo-600 translate-y-0' : 'text-slate-400 group-hover:bg-slate-100 group-active:scale-95'}`}>
                  <ShoppingCart size={24} strokeWidth={activeTab === 'shopping' ? 2.5 : 2} />
                </div>
                <span className={`text-[10px] font-semibold mt-1 transition-all duration-300 ${activeTab === 'shopping' ? 'text-indigo-600' : 'text-slate-400'}`}>List</span>
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
        </nav>

        <Modal isOpen={isAddItemOpen} onClose={() => { setIsAddItemOpen(false); setIsCreatingCategory(false); }} title="Add Item">
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Item Name</label>
              <input autoFocus type="text" value={newItemName} onChange={(e) => setNewItemName(e.target.value)} placeholder="e.g. Milk" className="w-full p-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none" onKeyDown={(e) => e.key === 'Enter' && addItem(newItemName, newItemCategory)} />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Category</label>
              {isCreatingCategory ? (
                <div className="flex gap-2 animate-in fade-in zoom-in-95">
                  <input type="text" autoFocus value={customCategoryName} onChange={(e) => setCustomCategoryName(e.target.value)} placeholder="New category name..." className="flex-1 p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none text-sm" onKeyDown={(e) => e.key === 'Enter' && createCustomCategory()} />
                  <button onClick={createCustomCategory} className="bg-indigo-600 text-white px-3 py-2 rounded-lg text-sm font-medium">Save</button>
                  <button onClick={() => setIsCreatingCategory(false)} className="bg-gray-100 text-gray-600 px-3 py-2 rounded-lg text-sm font-medium">Cancel</button>
                </div>
              ) : (
                <div className="grid grid-cols-2 gap-2">
                  {allCategories.map(cat => (
                    <button key={cat.id} onClick={() => setNewItemCategory(cat.id)} className={`p-2 rounded-lg text-sm text-left transition-all ${newItemCategory === cat.id ? 'ring-2 ring-indigo-500 bg-gray-50' : 'bg-white border border-gray-200'}`}>
                      <div className="flex items-center gap-2">
                        <div className={`w-3 h-3 rounded-full ${cat.color.split(' ')[0].replace('text', 'bg')}`}></div>
                        <span className="truncate">{cat.name}</span>
                      </div>
                    </button>
                  ))}
                  <button onClick={() => setIsCreatingCategory(true)} className="p-2 rounded-lg text-sm text-center border border-dashed border-gray-300 text-gray-500 hover:bg-gray-50 hover:text-indigo-600 transition-colors flex items-center justify-center gap-1">
                    <Plus size={14} /> New Category
                  </button>
                </div>
              )}
            </div>
            <button onClick={() => { addItem(newItemName, newItemCategory); setIsAddItemOpen(false); }} className="w-full bg-indigo-600 text-white p-3 rounded-xl font-bold hover:bg-indigo-700 transition-colors mt-2">Add to List</button>
          </div>
        </Modal>

        <Modal isOpen={isAddRecipeOpen} onClose={() => setIsAddRecipeOpen(false)} title="New Recipe">
           <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Recipe Name</label>
              <input type="text" value={newRecipeName} onChange={(e) => setNewRecipeName(e.target.value)} placeholder="e.g. Spaghetti Carbonara" className="w-full p-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Ingredients (one per line)</label>
              <textarea value={newRecipeIngredients} onChange={(e) => setNewRecipeIngredients(e.target.value)} placeholder="Spaghetti&#10;Eggs&#10;Bacon&#10;Parmesan" rows={5} className="w-full p-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none resize-none" />
            </div>
            <button onClick={addRecipe} className="w-full bg-indigo-600 text-white p-3 rounded-xl font-bold hover:bg-indigo-700 transition-colors">Save Recipe</button>
          </div>
        </Modal>

        <Modal isOpen={!!selectedRecipe} onClose={() => setSelectedRecipe(null)} title={selectedRecipe?.name}>
           <div className="space-y-6">
              <div className="bg-gray-50 p-4 rounded-xl">
                <h3 className="font-bold text-gray-800 mb-2 flex items-center gap-2">
                  <ShoppingCart size={18} className="text-emerald-600" /> Ingredients
                </h3>
                <ul className="list-disc list-inside space-y-1 text-gray-700">
                  {selectedRecipe?.ingredients.map((ing, idx) => (
                    <li key={idx}>{ing.name}</li>
                  ))}
                </ul>
              </div>
              <button onClick={() => { addRecipeToShoppingList(selectedRecipe); setSelectedRecipe(null); }} className="w-full bg-indigo-600 text-white p-4 rounded-xl font-bold hover:bg-indigo-700 transition-colors flex items-center justify-center gap-2 shadow-lg">
                <Plus size={20} /> Add to Shopping List
              </button>
           </div>
        </Modal>

        <Modal isOpen={isSelectRecipeOpen} onClose={() => setIsSelectRecipeOpen(false)} title="Select Meal">
          <div className="space-y-3">
             <p className="text-sm text-gray-500 mb-2">This will add the meal to your plan and ingredients to your list.</p>
             {recipes.length === 0 ? (
               <div className="text-center py-8 text-gray-400">No recipes yet.</div>
             ) : (
               recipes.map(recipe => (
                 <button key={recipe.id} onClick={() => { planMeal(recipe, planningDayOffset); setIsSelectRecipeOpen(false); }} className="w-full text-left p-4 rounded-xl bg-gray-50 hover:bg-indigo-50 border border-transparent hover:border-indigo-200 transition-all group">
                   <div className="flex justify-between items-center">
                     <span className="font-bold text-gray-700 group-hover:text-indigo-700">{recipe.name}</span>
                     <CalendarPlus size={18} className="text-gray-300 group-hover:text-indigo-500" />
                   </div>
                   <span className="text-xs text-gray-400">{recipe.ingredients.length} ingredients</span>
                 </button>
               ))
             )}
          </div>
        </Modal>
      </div>
    </div>
  );
}
