const PHRASE_ALIASES = new Map([
  ['bell peppers', 'bell pepper'],
  ['capsicum', 'bell pepper'],
  ['capsicums', 'bell pepper'],
  ['cilantro', 'coriander'],
  ['green onion', 'spring onion'],
  ['green onions', 'spring onion'],
  ['scallion', 'spring onion'],
  ['scallions', 'spring onion'],
  ['spring onions', 'spring onion'],
  ['courgette', 'zucchini'],
  ['courgettes', 'zucchini'],
  ['garbanzo bean', 'chickpea'],
  ['garbanzo beans', 'chickpea'],
  ['chickpeas', 'chickpea'],
  ['aubergine', 'eggplant'],
  ['aubergines', 'eggplant'],
]);

// Canonical bilingual vocabulary for common groceries. Keeping this explicit
// makes automatic database merges predictable and avoids sending household
// shopping data to an external translation or AI service.
const TOKEN_ALIASES = new Map([
  ['banane', 'banana'],
  ['bananen', 'banana'],
  ['koriander', 'coriander'],
  ['apfel', 'apple'],
  ['apfeln', 'apple'],
  ['birne', 'pear'],
  ['birnen', 'pear'],
  ['erdbeere', 'strawberry'],
  ['erdbeeren', 'strawberry'],
  ['himbeere', 'raspberry'],
  ['himbeeren', 'raspberry'],
  ['blaubeere', 'blueberry'],
  ['blaubeeren', 'blueberry'],
  ['zitrone', 'lemon'],
  ['zitronen', 'lemon'],
  ['limette', 'lime'],
  ['limetten', 'lime'],
  ['orange', 'orange'],
  ['orangen', 'orange'],
  ['traube', 'grape'],
  ['trauben', 'grape'],
  ['kartoffel', 'potato'],
  ['kartoffeln', 'potato'],
  ['tomate', 'tomato'],
  ['tomaten', 'tomato'],
  ['zwiebel', 'onion'],
  ['zwiebeln', 'onion'],
  ['knoblauch', 'garlic'],
  ['karotte', 'carrot'],
  ['karotten', 'carrot'],
  ['mohre', 'carrot'],
  ['mohren', 'carrot'],
  ['gurke', 'cucumber'],
  ['gurken', 'cucumber'],
  ['paprika', 'bell pepper'],
  ['brokkoli', 'broccoli'],
  ['blumenkohl', 'cauliflower'],
  ['spinat', 'spinach'],
  ['milch', 'milk'],
  ['kase', 'cheese'],
  ['eier', 'egg'],
  ['joghurt', 'yogurt'],
  ['reis', 'rice'],
  ['nudeln', 'pasta'],
  ['brot', 'bread'],
  ['mehl', 'flour'],
  ['zucker', 'sugar'],
  ['salz', 'salt'],
  ['pfeffer', 'pepper'],
  ['hahnchen', 'chicken'],
  ['rindfleisch', 'beef'],
  ['schweinefleisch', 'pork'],
  ['lachs', 'salmon'],
  ['thunfisch', 'tuna'],
]);

const NOISE_WORDS = new Set([
  'a', 'an', 'the', 'of', 'fresh', 'organic', 'pack', 'packet', 'bottle', 'bottles',
  'bag', 'bags', 'box', 'boxes', 'can', 'cans', 'tin', 'tins', 'jar', 'jars',
]);

const UNIT_WORDS = new Set([
  'g', 'gram', 'grams', 'kg', 'kilogram', 'kilograms', 'ml', 'l', 'liter',
  'liters', 'litre', 'litres', 'oz', 'ounce', 'ounces', 'lb', 'lbs', 'pound',
  'pounds', 'piece', 'pieces', 'pcs', 'x',
]);

const IRREGULAR_SINGULARS = new Map([
  ['berries', 'berry'],
  ['cherries', 'cherry'],
  ['potatoes', 'potato'],
  ['tomatoes', 'tomato'],
  ['loaves', 'loaf'],
  ['leaves', 'leaf'],
  ['knives', 'knife'],
]);

const singularize = (word) => {
  if (IRREGULAR_SINGULARS.has(word)) return IRREGULAR_SINGULARS.get(word);
  if (word.endsWith('ies') && word.length > 4) return `${word.slice(0, -3)}y`;
  if (word.endsWith('oes') && word.length > 4) return word.slice(0, -2);
  if (word.endsWith('ses') && word.length > 4) return word.slice(0, -2);
  if (word.endsWith('s') && !word.endsWith('ss') && word.length > 3) return word.slice(0, -1);
  return word;
};

export const normalizeItemName = (value = '') => {
  const cleaned = value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/&/g, ' and ')
    .replace(/\([^)]*\)/g, ' ')
    .replace(/\b\d+(?:[.,/]\d+)?\b/g, ' ')
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

  const aliasedPhrase = PHRASE_ALIASES.get(cleaned) || cleaned;
  const tokens = aliasedPhrase
    .split(' ')
    .filter(Boolean)
    .filter((token) => !NOISE_WORDS.has(token) && !UNIT_WORDS.has(token))
    .map(singularize)
    .map((token) => TOKEN_ALIASES.get(token) || token);

  return (PHRASE_ALIASES.get(tokens.join(' ')) || tokens.join(' ')).trim();
};

const levenshteinDistance = (left, right) => {
  if (left === right) return 0;
  if (!left.length) return right.length;
  if (!right.length) return left.length;

  const previous = Array.from({ length: right.length + 1 }, (_, index) => index);
  for (let leftIndex = 1; leftIndex <= left.length; leftIndex += 1) {
    const current = [leftIndex];
    for (let rightIndex = 1; rightIndex <= right.length; rightIndex += 1) {
      const substitutionCost = left[leftIndex - 1] === right[rightIndex - 1] ? 0 : 1;
      current[rightIndex] = Math.min(
        current[rightIndex - 1] + 1,
        previous[rightIndex] + 1,
        previous[rightIndex - 1] + substitutionCost,
      );
    }
    previous.splice(0, previous.length, ...current);
  }
  return previous[right.length];
};

export const itemSimilarity = (leftName, rightName) => {
  const left = normalizeItemName(leftName);
  const right = normalizeItemName(rightName);
  if (!left || !right) return 0;
  if (left === right) return 1;

  const longestLength = Math.max(left.length, right.length);
  const editScore = 1 - (levenshteinDistance(left, right) / longestLength);
  const leftTokens = new Set(left.split(' '));
  const rightTokens = new Set(right.split(' '));
  const intersection = [...leftTokens].filter((token) => rightTokens.has(token)).length;
  const union = new Set([...leftTokens, ...rightTokens]).size;
  const tokenScore = union ? intersection / union : 0;

  return Math.max(editScore, tokenScore);
};

const timestampValue = (timestamp) => timestamp?.seconds || 0;

export const findItemSuggestions = (items, query, limit = 5) => {
  const normalizedQuery = normalizeItemName(query);
  if (!normalizedQuery) return [];

  return items
    .map((item) => {
      const normalizedName = normalizeItemName(item.name);
      const similarity = itemSimilarity(normalizedQuery, normalizedName);
      const textScore = normalizedName.startsWith(normalizedQuery)
        ? 1
        : normalizedName.includes(normalizedQuery)
          ? 0.9
          : similarity;
      return { item, score: textScore };
    })
    .filter(({ score }) => score >= 0.55)
    .sort((left, right) => (
      right.score - left.score
      || timestampValue(right.item.boughtAt) - timestampValue(left.item.boughtAt)
      || (right.item.buyCount || 0) - (left.item.buyCount || 0)
    ))
    .slice(0, limit)
    .map(({ item }) => item);
};

export const findSemanticMatch = (items, name, threshold = 0.88) => {
  const matches = items
    .map((item) => ({ item, score: itemSimilarity(item.name, name) }))
    .filter(({ score }) => score >= threshold)
    .sort((left, right) => (
      right.score - left.score
      || Number(left.item.isBought) - Number(right.item.isBought)
      || timestampValue(right.item.boughtAt) - timestampValue(left.item.boughtAt)
    ));

  return matches[0]?.item || null;
};

export const inferItemCategory = (items, name, fallback = 'other') => {
  const categorizedItems = items.filter((item) => item.category);
  const suggestedMatch = findItemSuggestions(categorizedItems, name, 1)[0];
  const match = suggestedMatch || findSemanticMatch(categorizedItems, name, 0.72);
  return match?.category || fallback;
};

export const findDuplicateGroups = (items, threshold = 0.88) => {
  const remaining = [...items];
  const groups = [];

  while (remaining.length > 0) {
    const candidate = remaining.shift();
    const duplicates = [candidate];

    for (let index = remaining.length - 1; index >= 0; index -= 1) {
      if (itemSimilarity(candidate.name, remaining[index].name) >= threshold) {
        duplicates.push(remaining[index]);
        remaining.splice(index, 1);
      }
    }

    if (duplicates.length > 1) groups.push(duplicates);
  }

  return groups;
};

export const consolidateItemEntries = (entries) => entries.reduce((consolidated, entry) => {
  const existing = findSemanticMatch(consolidated, entry.name);
  const entryQuantity = Math.max(1, entry.quantity || 1);

  if (existing) {
    existing.quantity = Math.max(1, existing.quantity || 1) + entryQuantity;
  } else {
    consolidated.push({ ...entry, quantity: entryQuantity });
  }

  return consolidated;
}, []);

export const chooseMergedItem = (group) => {
  const sorted = [...group].sort((left, right) => (
    Number(left.isBought) - Number(right.isBought)
    || timestampValue(right.boughtAt) - timestampValue(left.boughtAt)
    || timestampValue(right.createdAt) - timestampValue(left.createdAt)
  ));
  const keeper = sorted[0];
  const categoryCounts = group.reduce((counts, item) => {
    if (item.category && item.category !== 'other') {
      counts[item.category] = (counts[item.category] || 0) + 1;
    }
    return counts;
  }, {});
  const preferredCategory = Object.entries(categoryCounts)
    .sort((left, right) => right[1] - left[1])[0]?.[0] || keeper.category || 'other';
  const isBought = group.every((item) => item.isBought);
  const activeItems = group.filter((item) => !item.isBought);
  const mostRecentBoughtItem = [...group]
    .sort((left, right) => timestampValue(right.boughtAt) - timestampValue(left.boughtAt))[0];
  const quantity = activeItems.length > 0
    ? activeItems.reduce((total, item) => total + Math.max(1, item.quantity || 1), 0)
    : Math.max(1, mostRecentBoughtItem.quantity || 1);

  return {
    keeper,
    duplicates: group.filter((item) => item.id !== keeper.id),
    data: {
      category: preferredCategory,
      isBought,
      boughtAt: isBought ? mostRecentBoughtItem.boughtAt || null : null,
      buyCount: group.reduce((total, item) => total + Math.max(0, item.buyCount || 0), 0),
      quantity,
    },
  };
};
