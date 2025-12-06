/**
 * Icon Mapper Utility
 * Maps AI-generated keyword strings to lucide-react icon component names
 */

// Comprehensive mapping of keywords to lucide-react icon names
export const iconKeywordMap: Record<string, string> = {
    // Health & Body Systems
    'gut': 'Heart',
    'stomach': 'CircleDot',
    'digestion': 'CircleDot',
    'digestive': 'CircleDot',
    'intestine': 'CircleDot',
    'colon': 'CircleDot',
    
    // Microbiome
    'bacteria': 'Bug',
    'probiotic': 'Pill',
    'probiotics': 'Pill',
    'microbiome': 'Bug',
    'biofilm': 'Layers',
    'flora': 'Flower2',
    
    // Immune System
    'immune': 'Shield',
    'immunity': 'ShieldCheck',
    'protection': 'ShieldCheck',
    'defense': 'Shield',
    
    // Vital Signs & Body Functions
    'heart': 'Heart',
    'cardiovascular': 'HeartPulse',
    'brain': 'Brain',
    'cognitive': 'Brain',
    'mental': 'Brain',
    'focus': 'Target',
    'memory': 'Brain',
    
    // Energy & Vitality
    'energy': 'Zap',
    'vitality': 'Zap',
    'stamina': 'Zap',
    'fatigue': 'BatteryLow',
    'tired': 'Moon',
    
    // Sleep
    'sleep': 'Moon',
    'rest': 'Moon',
    'insomnia': 'MoonStar',
    'relaxation': 'Waves',
    
    // Mood & Stress
    'mood': 'Smile',
    'happy': 'Smile',
    'stress': 'CloudLightning',
    'anxiety': 'CloudRain',
    'calm': 'Waves',
    'depression': 'Cloud',
    
    // Weight & Metabolism
    'weight': 'Scale',
    'metabolism': 'Activity',
    'fat': 'TrendingDown',
    'appetite': 'UtensilsCrossed',
    'bloating': 'CircleDot',
    'bloat': 'CircleDot',
    
    // Skin & Beauty
    'skin': 'Sparkles',
    'beauty': 'Sparkles',
    'glow': 'Sun',
    'aging': 'Clock',
    'wrinkles': 'Waves',
    'hair': 'Leaf',
    'nails': 'Fingerprint',
    
    // Bones & Joints
    'bone': 'Bone',
    'bones': 'Bone',
    'joint': 'Link',
    'joints': 'Link',
    'arthritis': 'Link',
    'flexibility': 'Waves',
    
    // Muscles & Strength
    'muscle': 'Dumbbell',
    'muscles': 'Dumbbell',
    'strength': 'Dumbbell',
    'exercise': 'Activity',
    'fitness': 'Activity',
    
    // Blood & Circulation
    'blood': 'Droplet',
    'circulation': 'RefreshCw',
    'pressure': 'Gauge',
    
    // Organs
    'liver': 'Bean',
    'kidney': 'Bean',
    'lungs': 'Wind',
    'detox': 'Droplets',
    
    // Hormones
    'hormone': 'Activity',
    'hormones': 'Activity',
    'estrogen': 'Activity',
    'testosterone': 'Activity',
    'thyroid': 'Activity',
    'menopause': 'Thermometer',
    
    // Inflammation
    'inflammation': 'Flame',
    'inflammatory': 'Flame',
    'pain': 'AlertCircle',
    'swelling': 'Circle',
    
    // Supplements & Ingredients
    'vitamin': 'Pill',
    'vitamins': 'Pill',
    'mineral': 'Gem',
    'minerals': 'Gem',
    'supplement': 'Pill',
    'capsule': 'Pill',
    'ingredient': 'Beaker',
    'ingredients': 'Beaker',
    'compound': 'Hexagon',
    'extract': 'FlaskConical',
    
    // Science & Research
    'research': 'FlaskConical',
    'study': 'BookOpen',
    'studies': 'BookOpen',
    'lab': 'FlaskConical',
    'test': 'TestTube',
    'tested': 'TestTube',
    'clinical': 'Stethoscope',
    'trial': 'ClipboardList',
    'science': 'Atom',
    'scientific': 'Atom',
    'formula': 'FlaskRound',
    'doctor': 'Stethoscope',
    'medical': 'Stethoscope',
    
    // Quality & Trust
    'quality': 'BadgeCheck',
    'certified': 'Award',
    'certification': 'Award',
    'organic': 'Leaf',
    'natural': 'TreeDeciduous',
    'pure': 'Droplets',
    'purity': 'Droplets',
    'safe': 'ShieldCheck',
    'safety': 'ShieldCheck',
    'verified': 'BadgeCheck',
    'guarantee': 'Medal',
    'guaranteed': 'Medal',
    
    // Benefits & Results
    'results': 'TrendingUp',
    'result': 'TrendingUp',
    'benefit': 'Star',
    'benefits': 'Star',
    'improvement': 'ArrowUpRight',
    'improve': 'ArrowUpRight',
    'effective': 'Target',
    'powerful': 'Zap',
    'potent': 'Zap',
    'fast': 'Timer',
    'quick': 'Timer',
    'lasting': 'Clock',
    'long-term': 'Clock',
    'sustainable': 'Recycle',
    
    // Warnings & Concerns
    'warning': 'AlertTriangle',
    'danger': 'AlertOctagon',
    'risk': 'AlertCircle',
    'problem': 'XCircle',
    'issue': 'Info',
    'side effect': 'AlertTriangle',
    'caution': 'AlertTriangle',
    
    // General Positive
    'check': 'Check',
    'success': 'CheckCircle',
    'star': 'Star',
    'best': 'Award',
    'premium': 'Crown',
    'exclusive': 'Sparkles',
    
    // General Info
    'info': 'Info',
    'information': 'Info',
    'tip': 'Lightbulb',
    'note': 'StickyNote',
    'important': 'AlertCircle',
    'key': 'Key',
    
    // Time & Duration
    'time': 'Clock',
    'daily': 'Calendar',
    'weekly': 'CalendarDays',
    'month': 'CalendarRange',
    'year': 'CalendarRange',
    
    // Default fallback
    'default': 'CircleDot',
};

/**
 * Get the lucide-react icon name for a given keyword
 * @param keyword - The keyword to map to an icon
 * @returns The lucide-react icon component name
 */
export function getIconName(keyword: string): string {
    if (!keyword) return iconKeywordMap['default'];
    
    const normalizedKeyword = keyword.toLowerCase().trim();
    
    // Direct match
    if (iconKeywordMap[normalizedKeyword]) {
        return iconKeywordMap[normalizedKeyword];
    }
    
    // Partial match - check if any key is contained in the keyword
    for (const [key, iconName] of Object.entries(iconKeywordMap)) {
        if (normalizedKeyword.includes(key) || key.includes(normalizedKeyword)) {
            return iconName;
        }
    }
    
    return iconKeywordMap['default'];
}

/**
 * Get all available icon keywords grouped by category
 */
export function getIconCategories(): Record<string, string[]> {
    return {
        'Health & Body': ['gut', 'stomach', 'heart', 'brain', 'liver', 'kidney', 'bone', 'muscle', 'blood'],
        'Microbiome': ['bacteria', 'probiotic', 'biofilm', 'microbiome', 'flora'],
        'Immune System': ['immune', 'immunity', 'protection', 'defense'],
        'Energy & Vitality': ['energy', 'vitality', 'stamina', 'fatigue'],
        'Sleep & Rest': ['sleep', 'rest', 'insomnia', 'relaxation'],
        'Mood': ['mood', 'stress', 'anxiety', 'calm'],
        'Science': ['research', 'study', 'lab', 'clinical', 'formula'],
        'Quality': ['quality', 'certified', 'organic', 'natural', 'safe'],
        'Benefits': ['results', 'benefit', 'improvement', 'effective'],
        'Warnings': ['warning', 'danger', 'risk', 'problem'],
    };
}

export default { iconKeywordMap, getIconName, getIconCategories };

