import React, { useState, useEffect } from 'react';
import { Play, BarChart2, CheckCircle, XCircle, ArrowRight, User, Target, Award, Zap, ChevronRight, BrainCircuit, Printer, FileText, ArrowLeft, Loader2 } from 'lucide-react';

// NEW HORIZONのカリキュラム目安を併記したカテゴリリスト
const categoriesList = [
    { id: 'be_1', label: 'be動詞 (am, are) [1年 U1,2]' },
    { id: 'be_2', label: 'be動詞 (is) [1年 U2]' },
    { id: 'gen_1', label: '一般動詞 (I, You) [1年 U3]' },
    { id: 'gen_2', label: '一般動詞 (三人称単数) [1年 U4]' },
    { id: 'can_wh', label: '助動詞can / 疑問詞 [1年 U5,6]' },
    { id: 'prog_pres', label: '現在進行形 [1年 U7]' },
    { id: 'past_be', label: '過去形 (be動詞) [1年 U8]' },
    { id: 'past_reg', label: '過去形 (一般動詞) [1年 U8,9]' },
    { id: 'prog_past', label: '過去進行形 [1年 U10]' },
    { id: 'future', label: '未来形 (will / be going to) [2年 U1]' },
    { id: 'conj', label: '接続詞 (when, if, because, that) [2年 U2]' },
    { id: 'inf_noun', label: '不定詞 (名詞的用法) [2年 U3]' },
    { id: 'modal', label: '助動詞 (must, may, should) [2年 U3]' },
    { id: 'inf_adj_adv', label: '不定詞 (形容詞・副詞的用法) [2年 U4]' },
    { id: 'gerund', label: '動名詞 [2年 U5]' },
    { id: 'compare', label: '比較 (原級, 比較級, 最上級) [2年 U6]' },
    { id: 'passive', label: '受動態 [2年 U7 / 3年 U1]' },
    { id: 'perf', label: '現在完了形 (経験, 継続, 完了) [3年 U1,2]' },
    { id: 'inf_syn', label: '不定詞構文 (It is~to / tell~to) [3年 U3]' },
    { id: 'ind_q', label: '間接疑問文 [3年 U4]' },
    { id: 'participle', label: '分詞による修飾 [3年 U5]' },
    { id: 'rel_pron', label: '関係代名詞 [3年 U6]' },
    { id: 'subjunctive', label: '仮定法 [3年 U7]' }
];

// --- Helper Functions ---
const getRandom = (arr) => arr[Math.floor(Math.random() * arr.length)];
const shuffle = (arr) => [...arr].sort(() => Math.random() - 0.5);
const normalize = (str) => str.replace(/[.?!,]/g, '').toLowerCase().trim();

const apiKey = "AIzaSyDNNmQIwxsiXY88bTTlTzLXQw3a09BSMvA"; // Canvas環境で自動注入されます

// --- Gemini API Call Functions ---
const callGeminiAPI = async (prompt, schema) => {
    const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-preview-09-2025:generateContent?key=${apiKey}`;
    const payload = {
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: {
            responseMimeType: "application/json",
            responseSchema: schema,
            temperature: 0.7
        }
    };
    
    let delay = 1000;
    for(let i = 0; i < 3; i++) {
        try {
            const res = await fetch(url, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(payload)
            });
            if (!res.ok) throw new Error(`HTTP error: ${res.status}`);
            const data = await res.json();
            const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
            if (!text) throw new Error("レスポンスにテキストが含まれていません");
            return JSON.parse(text);
        } catch(e) {
            if (i === 2) throw e;
            await new Promise(r => setTimeout(r, delay));
            delay *= 2;
        }
    }
};

// スキーマ定義
const quizSchema = {
    type: "OBJECT",
    properties: {
        questions: {
            type: "ARRAY",
            items: {
                type: "OBJECT",
                properties: {
                    type: { type: "STRING" },
                    category: { type: "STRING" },
                    j: { type: "STRING" },
                    e: { type: "STRING" },
                    ans: { type: "STRING" },
                    fullAns: { type: "STRING" },
                    opts: { type: "ARRAY", items: { type: "STRING" } },
                    words: { type: "ARRAY", items: { type: "STRING" } },
                    advice: { type: "STRING" }
                },
                required: ["type", "category", "j", "e", "ans", "fullAns", "opts", "words", "advice"]
            }
        }
    }
};

const printSchema = {
    type: "OBJECT",
    properties: {
        sheets: {
            type: "ARRAY",
            items: {
                type: "OBJECT",
                properties: {
                    categoryId: { type: "STRING" },
                    step1: {
                        type: "ARRAY", items: { type: "OBJECT", properties: { j: { type: "STRING" }, e: { type: "STRING" }, ans: { type: "STRING" }, advice: { type: "STRING" } }, required: ["j", "e", "ans", "advice"] }
                    },
                    step2: {
                        type: "ARRAY", items: { type: "OBJECT", properties: { j: { type: "STRING" }, words: { type: "ARRAY", items: { type: "STRING" } }, fullAns: { type: "STRING" }, advice: { type: "STRING" } }, required: ["j", "words", "fullAns", "advice"] }
                    },
                    step3: {
                        type: "ARRAY", items: { type: "OBJECT", properties: { j: { type: "STRING" }, fullAns: { type: "STRING" }, advice: { type: "STRING" } }, required: ["j", "fullAns", "advice"] }
                    }
                },
                required: ["categoryId", "step1", "step2", "step3"]
            }
        }
    }
};

// --- Fallback Local Generator (API失敗時用、絶対に崩壊しない固定文ベース) ---
const generateFallbackQuestion = (categoryId) => {
    const fallbacks = {
        'be_1': { j: '私は学生です。', full: 'I am a student.', blank: 'I (     ) a student.', ans: 'am', dummies: ['is', 'are', 'was'], words: ['I', 'am', 'a', 'student.'] },
        'gen_1': { j: 'あなたはテニスをします。', full: 'You play tennis.', blank: 'You (     ) tennis.', ans: 'play', dummies: ['plays', 'played', 'playing'], words: ['You', 'play', 'tennis.'] },
        'can_wh': { j: '彼は速く泳ぐことができます。', full: 'He can swim fast.', blank: 'He (     ) swim fast.', ans: 'can', dummies: ['must', 'will', 'should'], words: ['He', 'can', 'swim', 'fast.'] },
        'past_reg': { j: '私は昨日、部屋を掃除しました。', full: 'I cleaned the room yesterday.', blank: 'I (     ) the room yesterday.', ans: 'cleaned', dummies: ['clean', 'cleans', 'cleaning'], words: ['I', 'cleaned', 'the', 'room', 'yesterday.'] },
        'passive': { j: 'この本は多くの人に読まれています。', full: 'This book is read by many people.', blank: 'This book is (     ) by many people.', ans: 'read', dummies: ['reads', 'reading', 'readed'], words: ['This', 'book', 'is', 'read', 'by', 'many', 'people.'] },
        'subjunctive': { j: 'もし私が鳥なら、あなたのもとへ飛んでいくのに。', full: 'If I were a bird, I would fly to you.', blank: 'If I (     ) a bird, I would fly to you.', ans: 'were', dummies: ['am', 'was', 'are'], words: ['If', 'I', 'were', 'a', 'bird,', 'I', 'would', 'fly', 'to', 'you.'] }
    };
    
    const data = fallbacks[categoryId] || fallbacks['gen_1'];
    const rand = Math.random();
    const type = rand < 0.4 ? 'multiple-choice' : (rand < 0.8 ? 'ordering' : 'translation-choice');

    let q = { category: categoryId, type, advice: '文法の基本ルールを確認しよう！', j: data.j, ans: data.full, fullAns: data.full };

    if (type === 'multiple-choice') {
        q.e = data.blank; q.ans = data.ans; q.opts = shuffle([data.ans, ...data.dummies].slice(0, 4));
    } else if (type === 'translation-choice') {
        q.e = data.full; q.ans = data.j; q.opts = shuffle([data.j, data.j + 'か？', data.j.replace('です', 'ではありません').replace('ます', 'ません'), '彼は' + data.j.substring(2)]);
    } else {
        q.e = "正しい語順に並び替えよう："; q.words = shuffle(data.words);
    }
    return q;
};

// --- Main Components ---
export default function App() {
    const [view, setView] = useState('welcome');
    const [studentName, setStudentName] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [loadingMsg, setLoadingMsg] = useState('');
    const [stats, setStats] = useState(categoriesList.reduce((acc, cat) => ({ ...acc, [cat.id]: { total: 0, correct: 0 } }), {}));
    
    const [selectedCategories, setSelectedCategories] = useState(categoriesList.map(c => c.id));
    const [questionCount, setQuestionCount] = useState(5);
    const [printQuestionCount, setPrintQuestionCount] = useState(2);
    
    const [questions, setQuestions] = useState([]);
    const [currentIndex, setCurrentIndex] = useState(0);
    const [sessionScore, setSessionScore] = useState(0);
    const [isAnswered, setIsAnswered] = useState(false);
    const [selectedOption, setSelectedOption] = useState(null);

    const [orderedWords, setOrderedWords] = useState([]);
    const [availableWords, setAvailableWords] = useState([]);
    const [worksheetData, setWorksheetData] = useState([]);

    useEffect(() => {
        if (questions[currentIndex] && questions[currentIndex].type === 'ordering') {
            setOrderedWords([]);
            setAvailableWords(questions[currentIndex].words);
        }
    }, [currentIndex, questions]);

    // AIを利用してWebクイズを生成
    const handleStartQuiz = async () => {
        setIsLoading(true);
        setLoadingMsg('AIが最適なクイズを生成中...');
        try {
            const selectedLabels = selectedCategories.map(id => categoriesList.find(c => c.id === id).label);
            const prompt = `あなたはプロの英語教師です。中学生向けの英文法問題を生成してください。
対象単元: ${selectedLabels.join(', ')}
問題数: 合計${questionCount}問

各問題は、以下の3つの形式からランダムに選んでください：
1. multiple-choice (穴埋め4択問題)
2. ordering (整序問題: 日本語の意味になるように英単語を並び替える。不要な単語は含めない)
3. translation-choice (和訳選択: 英文の正しい日本語訳を4択から選ぶ)

【厳守事項】
- 日本語訳は直訳調や不自然な文末（「〜するしなければなりません」等）を絶対に避け、自然な日本語にしてください。
- opts配列やwords配列の中に同じ文字列が重複して入らないようにしてください。
- 問題の内容（主語やシチュエーション）が互いに似通らないように多様に分散させてください。`;

            const data = await callGeminiAPI(prompt, quizSchema);
            setQuestions(data.questions);
        } catch (error) {
            console.warn("AIでの問題生成に失敗したため、ローカルフォールバックを使用します。");
            // APIエラー時はローカルフォールバックで生成
            const fallback = Array.from({ length: questionCount }).map(() => generateFallbackQuestion(getRandom(selectedCategories)));
            setQuestions(fallback);
        }
        
        setCurrentIndex(0);
        setSessionScore(0);
        setIsAnswered(false);
        setSelectedOption(null);
        setIsLoading(false);
        setView('quiz');
    };

    // AIを利用してプリントを生成
    const handleGenerateWorksheet = async () => {
        setIsLoading(true);
        setLoadingMsg('AIがプリント用問題を構成中...');
        try {
            const catObjects = selectedCategories.map(id => ({ id, label: categoriesList.find(c => c.id === id).label }));
            const prompt = `あなたはプロの英語教師です。中学生向けの英文法プリント用問題を生成してください。
以下の各単元について、3つのステップごとに ${printQuestionCount} 問ずつ作成してください。

対象単元リスト:
${catObjects.map(c => `- ${c.id}: ${c.label}`).join('\n')}

Step 1: 穴埋め問題 (空欄を (     ) とした英文と、そこに入る正解の語)
Step 2: 並び替え問題 (正解の英文を単語ごとに分割・シャッフルした配列を words に入れる)
Step 3: 全文英訳問題 (日本語から英語への翻訳。正解の英文を fullAns に入れる)

【厳守事項】
- 不自然な日本語を絶対に避け、自然な日本語にしてください。
- 問題の内容（主語、動詞、シチュエーション）を完全に分散させ、似たような文章が連続しないようにしてください。
- adviceには、生徒が間違えやすいポイントを優しく1〜2文で解説してください。`;

            const data = await callGeminiAPI(prompt, printSchema);
            
            // ラベルを付与してセット
            const sheetsWithLabels = data.sheets.map(sheet => ({
                ...sheet,
                categoryLabel: categoriesList.find(c => c.id === sheet.categoryId)?.label || sheet.categoryId
            }));
            setWorksheetData(sheetsWithLabels);
        } catch (error) {
            console.warn("AIでのプリント生成に失敗したため、ローカルフォールバックを使用します。");
            // フォールバック
            const fallbackSheets = selectedCategories.map(catId => {
                const s1=[], s2=[], s3=[];
                for(let i=0;i<printQuestionCount;i++){
                    s1.push({j:'私は学生です。', e:'I (     ) a student.', ans:'am', advice:'主語がIの時はamを使うよ。'});
                    s2.push({j:'あなたはテニスをします。', words:['You','play','tennis.'], fullAns:'You play tennis.', advice:'主語の次に動詞を置こう。'});
                    s3.push({j:'彼は速く泳ぐことができます。', fullAns:'He can swim fast.', advice:'canの後ろは動詞の原形だよ。'});
                }
                return { categoryId: catId, categoryLabel: categoriesList.find(c=>c.id===catId).label, step1: s1, step2: s2, step3: s3 };
            });
            setWorksheetData(fallbackSheets);
        }
        setIsLoading(false);
        setView('print');
    };

    const handleWeaknessMode = () => {
        const weakCats = categoriesList.map(c => c.id).filter(cId => {
            const st = stats[cId];
            if (st.total === 0) return true; 
            return (st.correct / st.total) < 0.6;
        });
        setSelectedCategories(weakCats.length > 0 ? weakCats : categoriesList.map(c => c.id));
    };

    const handleAnswerSelect = (opt) => {
        if (isAnswered) return;
        setSelectedOption(opt);
        setIsAnswered(true);
        
        const isCorrect = opt === questions[currentIndex].ans;
        if (isCorrect) setSessionScore(s => s + 1);
        
        const cat = questions[currentIndex].category;
        setStats(prev => ({
            ...prev,
            [cat]: { total: prev[cat].total + 1, correct: prev[cat].correct + (isCorrect ? 1 : 0) }
        }));
    };

    const handleWordClick = (word, index) => {
        setOrderedWords([...orderedWords, word]);
        setAvailableWords(availableWords.filter((_, i) => i !== index));
    };

    const handleOrderedWordClick = (word, index) => {
        setAvailableWords([...availableWords, word]);
        setOrderedWords(orderedWords.filter((_, i) => i !== index));
    };

    const handleCheckOrder = () => {
        if (isAnswered) return;
        const currentQ = questions[currentIndex];
        const userAnswer = orderedWords.join(' ');
        const isCorrect = normalize(userAnswer) === normalize(currentQ.fullAns || currentQ.ans);

        setIsAnswered(true);
        setSelectedOption(userAnswer); 
        if (isCorrect) setSessionScore(s => s + 1);
        
        const cat = currentQ.category;
        setStats(prev => ({
            ...prev,
            [cat]: { total: prev[cat].total + 1, correct: prev[cat].correct + (isCorrect ? 1 : 0) }
        }));
    };

    const handleNext = () => {
        if (currentIndex < questions.length - 1) {
            setCurrentIndex(i => i + 1);
            setIsAnswered(false);
            setSelectedOption(null);
        } else {
            setView('result');
        }
    };

    if (isLoading) {
        return (
            <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-4 font-sans">
                <Loader2 className="animate-spin text-indigo-600 mb-6" size={64} />
                <h2 className="text-2xl font-extrabold text-slate-800 mb-2">{loadingMsg}</h2>
                <p className="text-slate-500 font-medium text-center">自然で多様な問題文を構成しています<br/>少々お待ちください...</p>
            </div>
        );
    }

    if (view === 'welcome') {
        return (
            <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4 font-sans">
                <div className="bg-white rounded-2xl shadow-xl max-w-md w-full p-8 text-center border border-slate-100">
                    <div className="w-20 h-20 bg-indigo-100 text-indigo-600 rounded-full flex items-center justify-center mx-auto mb-6">
                        <BrainCircuit size={40} />
                    </div>
                    <h1 className="text-3xl font-extrabold text-slate-800 mb-2">EngGrammar Quiz</h1>
                    <p className="text-slate-500 font-bold mb-2">Gemini AI 内蔵バージョン</p>
                    <p className="text-slate-500 text-sm mb-8">AIが無限のバリエーションで<br/>自然な問題と解説を生成します！</p>
                    
                    <div className="text-left mb-8">
                        <label className="block text-sm font-bold text-slate-700 mb-2">名前を教えてね</label>
                        <input 
                            type="text" 
                            className="w-full px-4 py-3 rounded-xl border-2 border-slate-200 focus:border-indigo-500 focus:ring-0 outline-none transition-all text-lg"
                            placeholder="例：タロウ"
                            value={studentName}
                            onChange={e => setStudentName(e.target.value)}
                            onKeyDown={e => e.key === 'Enter' && studentName.trim() && setView('home')}
                        />
                    </div>
                    <button 
                        onClick={() => setView('home')}
                        disabled={!studentName.trim()}
                        className="w-full py-4 bg-indigo-600 hover:bg-indigo-700 disabled:bg-slate-300 disabled:cursor-not-allowed text-white rounded-xl font-bold text-lg flex items-center justify-center gap-2 transition-all shadow-md hover:shadow-lg"
                    >
                        学習をはじめる <ArrowRight size={20} />
                    </button>
                </div>
            </div>
        );
    }

    if (view === 'home') {
        return (
            <div className="min-h-screen bg-slate-50 p-4 md:p-8 font-sans">
                <div className="max-w-5xl mx-auto space-y-6">
                    <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between bg-white p-6 rounded-2xl shadow-sm border border-slate-100 gap-4">
                        <div>
                            <h2 className="text-2xl font-extrabold text-slate-800 flex items-center gap-2">
                                <User className="text-indigo-600" /> {studentName} さんの学習ルーム
                            </h2>
                            <p className="text-slate-500 mt-1">君の学習状況に合わせて出題形式が最適化されるよ！</p>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                        {/* Stats Panel */}
                        <div className="col-span-1 lg:col-span-1 bg-white p-6 rounded-2xl shadow-sm border border-slate-100 max-h-[85vh] overflow-y-auto">
                            <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2 mb-6">
                                <BarChart2 className="text-indigo-500" /> 学習データの分析
                            </h3>
                            <div className="space-y-5">
                                {categoriesList.map(cat => {
                                    const st = stats[cat.id];
                                    const pct = st.total === 0 ? 0 : Math.round((st.correct / st.total) * 100);
                                    let color = "bg-slate-200";
                                    if (st.total > 0) {
                                        color = pct >= 80 ? "bg-emerald-500" : pct >= 50 ? "bg-amber-400" : "bg-rose-500";
                                    }
                                    return (
                                        <div key={cat.id}>
                                            <div className="flex justify-between text-sm font-medium mb-1.5">
                                                <span className="text-slate-700">{cat.label}</span>
                                                <span className={st.total === 0 ? "text-slate-400" : "text-slate-700"}>
                                                    {st.total === 0 ? '- %' : `${pct}%`}
                                                </span>
                                            </div>
                                            <div className="w-full bg-slate-100 rounded-full h-2.5 overflow-hidden">
                                                <div className={`h-2.5 rounded-full ${color} transition-all duration-500`} style={{ width: `${pct}%` }}></div>
                                            </div>
                                        </div>
                                    )
                                })}
                            </div>
                        </div>

                        {/* Settings Panel */}
                        <div className="col-span-1 lg:col-span-2 bg-white p-6 rounded-2xl shadow-sm border border-slate-100 flex flex-col justify-between">
                            <div>
                                <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2 mb-4">
                                    <Target className="text-indigo-500" /> 単元設定とモード選択
                                </h3>
                                
                                <div className="mb-6">
                                    <div className="flex items-center justify-between mb-3">
                                        <p className="text-sm font-bold text-slate-600">学習する単元（NEW HORIZON対応）</p>
                                        <button 
                                            onClick={handleWeaknessMode}
                                            className="text-xs font-bold text-rose-600 bg-rose-50 px-3 py-1.5 rounded-lg hover:bg-rose-100 transition-colors flex items-center gap-1"
                                        >
                                            <Zap size={14}/> 弱点を自動選択
                                        </button>
                                    </div>
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-h-[40vh] overflow-y-auto p-1">
                                        {categoriesList.map(cat => (
                                            <label key={cat.id} className={`flex items-center justify-start p-3 border-2 rounded-xl cursor-pointer transition-all duration-200 select-none ${selectedCategories.includes(cat.id) ? 'bg-indigo-50 border-indigo-500 text-indigo-700 font-bold' : 'bg-white border-slate-200 text-slate-600 hover:border-indigo-300'}`}>
                                                <input 
                                                    type="checkbox" 
                                                    className="hidden"
                                                    checked={selectedCategories.includes(cat.id)}
                                                    onChange={(e) => {
                                                        if (e.target.checked) setSelectedCategories([...selectedCategories, cat.id]);
                                                        else setSelectedCategories(selectedCategories.filter(c => c !== cat.id));
                                                    }}
                                                />
                                                <span className="text-sm md:text-base">{cat.label}</span>
                                            </label>
                                        ))}
                                    </div>
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    <div>
                                        <p className="text-sm font-bold text-slate-600 mb-3">問題数（Webクイズ用）</p>
                                        <div className="flex gap-3">
                                            {[5, 10, 15].map(num => (
                                                <button
                                                    key={num}
                                                    onClick={() => setQuestionCount(num)}
                                                    className={`flex-1 py-3 rounded-xl border-2 font-bold transition-all duration-200 ${questionCount === num ? 'bg-indigo-50 border-indigo-500 text-indigo-700' : 'bg-white border-slate-200 text-slate-500 hover:border-indigo-300'}`}
                                                >
                                                    {num} 問
                                                </button>
                                            ))}
                                        </div>
                                    </div>
                                    <div>
                                        <p className="text-sm font-bold text-slate-600 mb-3">プリント用：各ステップの問題数</p>
                                        <div className="flex gap-3">
                                            {[1, 2, 3].map(num => (
                                                <button
                                                    key={`print-${num}`}
                                                    onClick={() => setPrintQuestionCount(num)}
                                                    className={`flex-1 py-3 rounded-xl border-2 font-bold transition-all duration-200 ${printQuestionCount === num ? 'bg-emerald-50 border-emerald-500 text-emerald-700' : 'bg-white border-slate-200 text-slate-500 hover:border-emerald-300'}`}
                                                >
                                                    {num} 問
                                                </button>
                                            ))}
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <div className="mt-8 flex flex-col sm:flex-row gap-4">
                                <button 
                                    onClick={handleStartQuiz}
                                    disabled={selectedCategories.length === 0}
                                    className="flex-1 py-4 bg-indigo-600 hover:bg-indigo-700 disabled:bg-slate-300 text-white rounded-xl font-bold text-lg flex items-center justify-center gap-2 transition-all shadow-md hover:shadow-lg"
                                >
                                    <Play fill="currentColor" size={20} /> Webでクイズ開始
                                </button>
                                <button 
                                    onClick={handleGenerateWorksheet}
                                    disabled={selectedCategories.length === 0}
                                    className="flex-1 py-4 bg-emerald-600 hover:bg-emerald-700 disabled:bg-slate-300 text-white rounded-xl font-bold text-lg flex items-center justify-center gap-2 transition-all shadow-md hover:shadow-lg"
                                >
                                    <FileText size={20} /> プリントを作成する
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    if (view === 'quiz') {
        const currentQ = questions[currentIndex];
        
        let isCorrect = false;
        if (isAnswered) {
            if (currentQ.type === 'multiple-choice' || currentQ.type === 'translation-choice') {
                isCorrect = selectedOption === currentQ.ans;
            } else {
                isCorrect = normalize(orderedWords.join(' ')) === normalize(currentQ.fullAns || currentQ.ans);
            }
        }

        const categoryLabel = categoriesList.find(c => c.id === currentQ.category)?.label || currentQ.category;
        const typeLabel = currentQ.type === 'ordering' ? '整序問題' : (currentQ.type === 'translation-choice' ? '和訳選択' : '穴埋め問題');

        return (
            <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-4 font-sans">
                <div className="max-w-2xl w-full">
                    {/* Progress Bar */}
                    <div className="mb-6 flex items-center gap-4">
                        <span className="text-sm font-extrabold text-slate-400 min-w-[3rem]">Q {currentIndex + 1}</span>
                        <div className="w-full bg-slate-200 rounded-full h-3 overflow-hidden">
                            <div className="bg-indigo-500 h-3 rounded-full transition-all duration-500" style={{ width: `${((currentIndex) / questions.length) * 100}%` }}></div>
                        </div>
                        <span className="text-sm font-bold text-slate-400">{questions.length}</span>
                    </div>

                    {/* Question Card */}
                    <div className="bg-white rounded-2xl shadow-lg p-6 md:p-10 mb-6 border border-slate-100">
                        <div className="flex justify-between items-center mb-5">
                            <span className="inline-block px-3 py-1 text-xs font-bold text-indigo-700 bg-indigo-100 rounded-lg">
                                {categoryLabel}
                            </span>
                            <span className="inline-block px-3 py-1 text-xs font-bold text-amber-700 bg-amber-100 rounded-lg">
                                {typeLabel}
                            </span>
                        </div>

                        {currentQ.type === 'translation-choice' ? (
                            <p className="text-xl md:text-2xl font-black text-slate-800 mb-10 tracking-wide text-center">
                                {currentQ.e}
                            </p>
                        ) : (
                            <>
                                <p className="text-slate-600 text-lg md:text-xl font-medium mb-6 leading-relaxed">
                                    {currentQ.j}
                                </p>
                                <p className="text-xl md:text-2xl font-black text-slate-800 mb-10 tracking-wide">
                                    {currentQ.e}
                                </p>
                            </>
                        )}

                        {/* Options / Ordering UI */}
                        {currentQ.type === 'multiple-choice' || currentQ.type === 'translation-choice' ? (
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                {currentQ.opts?.map((opt, i) => (
                                    <button 
                                        key={`opt-${i}-${opt}`}
                                        onClick={() => handleAnswerSelect(opt)}
                                        disabled={isAnswered}
                                        className={`p-5 rounded-xl text-lg font-bold transition-all duration-200 border-2 text-left 
                                            ${!isAnswered ? 'border-slate-200 hover:border-indigo-400 hover:bg-indigo-50 text-slate-700 shadow-sm hover:shadow' :
                                              opt === currentQ.ans ? 'border-emerald-500 bg-emerald-50 text-emerald-700 shadow-md transform scale-[1.02]' :
                                              opt === selectedOption ? 'border-rose-500 bg-rose-50 text-rose-700 opacity-80' : 'border-slate-100 text-slate-400 opacity-40'
                                            }`}
                                    >
                                        {opt}
                                    </button>
                                ))}
                            </div>
                        ) : (
                            <div className="space-y-6">
                                <div className="min-h-[4.5rem] p-4 bg-slate-100 rounded-xl flex flex-wrap gap-2 items-center border-2 border-dashed border-slate-300">
                                    {orderedWords.map((w, i) => (
                                        <button 
                                            key={`ow-${i}`} 
                                            onClick={() => !isAnswered && handleOrderedWordClick(w, i)} 
                                            className={`px-4 py-2 font-bold rounded-lg shadow-sm transition-colors ${
                                                isAnswered 
                                                    ? (isCorrect ? 'bg-emerald-500 text-white cursor-default' : 'bg-rose-500 text-white cursor-default')
                                                    : 'bg-indigo-600 hover:bg-indigo-700 text-white'
                                            }`}
                                        >
                                            {w}
                                        </button>
                                    ))}
                                </div>
                                
                                {!isAnswered && (
                                    <div className="flex flex-wrap gap-2 justify-center">
                                        {availableWords.map((w, i) => (
                                            <button 
                                                key={`aw-${i}`} 
                                                onClick={() => handleWordClick(w, i)} 
                                                className="px-4 py-2 bg-white text-slate-700 border-2 border-slate-200 font-bold rounded-lg shadow-sm hover:border-indigo-400 hover:bg-indigo-50 transition-all"
                                            >
                                                {w}
                                            </button>
                                        ))}
                                    </div>
                                )}

                                {!isAnswered && (
                                    <button 
                                        onClick={handleCheckOrder} 
                                        disabled={orderedWords.length === 0} 
                                        className="w-full py-4 bg-emerald-500 hover:bg-emerald-600 disabled:bg-slate-300 text-white rounded-xl font-bold text-lg transition-all shadow-md mt-4"
                                    >
                                        解答する
                                    </button>
                                )}
                            </div>
                        )}
                    </div>

                    {/* Feedback Area */}
                    {isAnswered && (
                        <div className={`p-6 rounded-2xl mb-6 flex items-start gap-4 border ${isCorrect ? 'bg-emerald-50 border-emerald-200 text-emerald-800' : 'bg-rose-50 border-rose-200 text-rose-800'}`}>
                             <div className="mt-1 flex-shrink-0">
                                 {isCorrect ? <CheckCircle size={32} /> : <XCircle size={32} />}
                             </div>
                             <div className="w-full">
                                 <h3 className="font-extrabold text-xl mb-2">
                                     {isCorrect ? getRandom(correctMessages) : getRandom(wrongMessages)}
                                 </h3>
                                 {!isCorrect && (
                                     <div className="mb-3 p-3 bg-white/60 rounded-lg border border-rose-100">
                                         <p className="text-sm font-bold text-rose-600 mb-1">正解：</p>
                                         <p className="font-bold text-lg">{currentQ.type === 'translation-choice' ? currentQ.ans : (currentQ.fullAns || currentQ.ans)}</p>
                                     </div>
                                 )}
                                 <p className="font-medium opacity-90 leading-relaxed">{currentQ.advice}</p>
                             </div>
                        </div>
                    )}

                    {/* Next Button */}
                    {isAnswered && (
                        <button 
                            onClick={handleNext}
                            className="w-full py-5 bg-slate-800 hover:bg-slate-900 text-white rounded-2xl font-bold text-xl flex items-center justify-center gap-2 transition-all shadow-lg hover:shadow-xl transform hover:-translate-y-1"
                        >
                            {currentIndex < questions.length - 1 ? '次の問題へ' : '結果を見る'}
                            <ChevronRight size={24} />
                        </button>
                    )}
                </div>
            </div>
        );
    }

    if (view === 'result') {
        const percentage = Math.round((sessionScore / questions.length) * 100);
        let feedbackTitle = "お疲れ様！";
        let feedbackDesc = "日々の積み重ねが力になるよ。";
        
        if (percentage >= 80) {
            feedbackTitle = "素晴らしい成績です！";
            feedbackDesc = "この調子なら、次はもっと難しい応用問題が出題されるかも！？";
        } else if (percentage <= 50) {
            feedbackTitle = "ナイストライ！";
            feedbackDesc = "間違えたところは成長のチャンス。アドバイスを思い出してまた挑戦しよう！";
        }

        return (
            <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4 font-sans">
                <div className="bg-white rounded-3xl shadow-xl max-w-md w-full p-8 text-center border border-slate-100">
                    <div className="w-24 h-24 bg-indigo-100 text-indigo-600 rounded-full flex items-center justify-center mx-auto mb-6">
                        <Award size={48} />
                    </div>
                    <h2 className="text-3xl font-black text-slate-800 mb-2">{feedbackTitle}</h2>
                    <p className="text-slate-500 font-medium mb-8">{feedbackDesc}</p>
                    
                    <div className="bg-slate-50 rounded-2xl p-6 mb-8 border border-slate-100">
                        <p className="text-sm font-bold text-slate-500 mb-1">今回のスコア</p>
                        <div className="flex items-baseline justify-center gap-2">
                            <span className="text-5xl font-black text-indigo-600">{sessionScore}</span>
                            <span className="text-xl font-bold text-slate-400">/ {questions.length}</span>
                        </div>
                    </div>

                    <button 
                        onClick={() => setView('home')}
                        className="w-full py-4 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-bold text-lg flex items-center justify-center gap-2 transition-all shadow-md hover:shadow-lg"
                    >
                        ホームに戻る
                    </button>
                </div>
            </div>
        );
    }

    if (view === 'print') {
        return (
            <div className="min-h-screen bg-slate-200 p-4 md:p-8 font-serif print:bg-white print:p-0">
                {/* Non-printable UI header */}
                <div className="max-w-4xl mx-auto mb-6 flex justify-between items-center print:hidden bg-white p-4 rounded-xl shadow-sm">
                    <button 
                        onClick={() => setView('home')}
                        className="text-slate-500 hover:text-slate-800 flex items-center gap-2 font-bold transition-colors"
                    >
                        <ArrowLeft size={20} /> 戻る
                    </button>
                    <button 
                        onClick={() => window.print()}
                        className="bg-indigo-600 hover:bg-indigo-700 text-white px-6 py-2 rounded-lg font-bold flex items-center gap-2 transition-colors shadow-sm"
                    >
                        <Printer size={20} /> 印刷する
                    </button>
                </div>

                {/* Printable Worksheet Area */}
                <div className="max-w-4xl mx-auto bg-white p-10 md:p-16 shadow-xl print:shadow-none print:w-full print:max-w-none text-black">
                    
                    {/* 1. 問題編 */}
                    <div className="mb-8 border-b-2 border-slate-800 pb-4 flex justify-between items-end">
                        <div>
                            <h1 className="text-3xl font-black mb-2">英文法 ステップアップ・プリント</h1>
                            <p className="text-lg font-bold text-slate-600">氏名：＿＿＿＿＿＿＿＿＿＿＿＿＿＿</p>
                        </div>
                        <p className="text-sm font-medium text-slate-500">問題編</p>
                    </div>

                    <div className="space-y-12">
                        {worksheetData.map((sheet, index) => (
                            <div key={`sheet-${index}`} className="break-inside-avoid">
                                <h2 className="text-xl font-extrabold bg-slate-100 p-3 rounded-lg mb-6 border-l-8 border-indigo-600">
                                    【{index + 1}】 {sheet.categoryLabel}
                                </h2>
                                
                                <div className="space-y-8 pl-4">
                                    {/* Step 1: Fill in */}
                                    <div>
                                        <p className="font-bold text-slate-700 mb-2"><span className="bg-indigo-100 text-indigo-800 px-2 py-1 rounded text-sm mr-2">Step 1</span>日本語の意味になるように、( )に適切な語を入れなさい。</p>
                                        {sheet.step1?.map((q, i) => (
                                            <div key={`sheet-${index}-s1-${i}`} className="mb-4">
                                                <p className="mb-1">({i+1}) {q.j}</p>
                                                <p className="text-lg font-mono tracking-wider">{q.e}</p>
                                            </div>
                                        ))}
                                    </div>

                                    {/* Step 2: Ordering */}
                                    <div>
                                        <p className="font-bold text-slate-700 mb-2"><span className="bg-indigo-100 text-indigo-800 px-2 py-1 rounded text-sm mr-2">Step 2</span>日本語の意味になるように、[ ]内の語句を正しく並び替えなさい。</p>
                                        {sheet.step2?.map((q, i) => (
                                            <div key={`sheet-${index}-s2-${i}`} className="mb-6">
                                                <p className="mb-1">({i+1}) {q.j}</p>
                                                <p className="text-lg mb-2">[ {q.words?.join(' / ')} ]</p>
                                                <p className="border-b border-slate-400 mt-6 h-6 w-full max-w-lg"></p>
                                            </div>
                                        ))}
                                    </div>

                                    {/* Step 3: Translation */}
                                    <div>
                                        <p className="font-bold text-slate-700 mb-2"><span className="bg-indigo-100 text-indigo-800 px-2 py-1 rounded text-sm mr-2">Step 3</span>次の日本語を英語に直しなさい。</p>
                                        {sheet.step3?.map((q, i) => (
                                            <div key={`sheet-${index}-s3-${i}`} className="mb-6">
                                                <p className="mb-2">({i+1}) {q.j}</p>
                                                <p className="border-b border-slate-400 mt-8 h-6 w-full max-w-2xl"></p>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>

                    {/* 改ページ */}
                    <div style={{ pageBreakBefore: 'always' }} className="pt-10"></div>

                    {/* 2. 解答編 */}
                    <div className="mb-8 border-b-2 border-slate-800 pb-4 flex justify-between items-end">
                        <h1 className="text-3xl font-black mb-2">【解答・解説編】 英文法ステップアップ</h1>
                    </div>

                    <div className="space-y-10">
                        {worksheetData.map((sheet, index) => (
                            <div key={`ans-${index}`} className="break-inside-avoid">
                                <h2 className="text-xl font-extrabold mb-4 border-b-2 border-slate-200 pb-2">
                                    【{index + 1}】 {sheet.categoryLabel}
                                </h2>
                                
                                <div className="space-y-6 pl-4">
                                    {/* Step 1 Ans */}
                                    <div>
                                        <p className="font-bold text-slate-500 text-sm mb-2">Step 1 (穴埋め)</p>
                                        {sheet.step1?.map((q, i) => (
                                            <div key={`ans-${index}-a1-${i}`} className="mb-3">
                                                <p className="text-lg font-bold text-rose-600 mb-1">({i+1}) {q.ans}</p>
                                                <p className="text-sm bg-slate-50 p-2 rounded border border-slate-200"><span className="font-bold text-indigo-600">Point!</span> {q.advice}</p>
                                            </div>
                                        ))}
                                    </div>

                                    {/* Step 2 Ans */}
                                    <div>
                                        <p className="font-bold text-slate-500 text-sm mb-2">Step 2 (並び替え)</p>
                                        {sheet.step2?.map((q, i) => (
                                            <div key={`ans-${index}-a2-${i}`} className="mb-3">
                                                <p className="text-lg font-bold text-rose-600 mb-1">({i+1}) {q.fullAns || q.ans}</p>
                                                <p className="text-sm bg-slate-50 p-2 rounded border border-slate-200"><span className="font-bold text-indigo-600">Point!</span> {q.advice}</p>
                                            </div>
                                        ))}
                                    </div>

                                    {/* Step 3 Ans */}
                                    <div>
                                        <p className="font-bold text-slate-500 text-sm mb-2">Step 3 (英訳)</p>
                                        {sheet.step3?.map((q, i) => (
                                            <div key={`ans-${index}-a3-${i}`} className="mb-3">
                                                <p className="text-lg font-bold text-rose-600 mb-1">({i+1}) {q.fullAns || q.ans}</p>
                                                <p className="text-sm bg-slate-50 p-2 rounded border border-slate-200"><span className="font-bold text-indigo-600">Point!</span> {q.advice}</p>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>

                </div>
            </div>
        );
    }

    return null;
}