/**
 * İçindekiler temizleyici / Türkçeleştirici.
 * - Türkçe metni sadeleştirir (yüzdeler, alt çizgiler, gereksiz noktalama).
 * - Yabancı metni (EN/FR/DE/ES/IT) sözlükle Türkçeye çevirir.
 * - Çevrilemeyen yabancı kelimeler kullanıcıya gösterilmez.
 */
import { normalize } from './analyzer';

const RAW = `
sugar=şeker|aqua=su|maigre=az yağlı|vanilline=vanilin|ecreme=yağsız|ecreme=yağsız|fat reduced=az yağlı|fat-reduced cocoa=az yağlı kakao|lecithines=lesitin|lecithine de soja=soya lesitini|soja=soya|sucre=şeker|zucker=şeker|azucar=şeker|zucchero=şeker|cane sugar=kamış şekeri|icing sugar=pudra şekeri|brown sugar=esmer şeker|glucose=glikoz|glucose syrup=glikoz şurubu|glucose-fructose syrup=glikoz-fruktoz şurubu|glucose fructose syrup=glikoz-fruktoz şurubu|sirop de glucose=glikoz şurubu|fructose=früktoz|dextrose=dekstroz|maltodextrin=maltodekstrin|invert sugar syrup=invert şeker şurubu|syrup=şurup|honey=bal|miel=bal|honig=bal
salt=tuz|sel=tuz|salz=tuz|sal=tuz|sale=tuz|sea salt=deniz tuzu|water=su|eau=su|wasser=su|agua=su|acqua=su
wheat=buğday|ble=buğday|weizen=buğday|trigo=buğday|grano=buğday|wheat flour=buğday unu|flour=un|farine=un|farine de ble=buğday unu|mehl=un|weizenmehl=buğday unu|harina=un|harina de trigo=buğday unu|farina=un|farina di grano=buğday unu|whole wheat flour=tam buğday unu|wholemeal wheat flour=tam buğday unu|wheat starch=buğday nişastası|wheat gluten=buğday glüteni|gluten=glüten|semolina=irmik|durum wheat semolina=durum buğdayı irmiği|durum wheat=durum buğdayı
rice=pirinç|riz=pirinç|reis=pirinç|arroz=pirinç|riso=pirinç|rice flour=pirinç unu|corn=mısır|mais=mısır|maiz=mısır|cornstarch=mısır nişastası|corn starch=mısır nişastası|maize starch=mısır nişastası|amidon de mais=mısır nişastası|starch=nişasta|amidon=nişasta|starke=nişasta|almidon=nişasta|amido=nişasta|potato starch=patates nişastası|modified starch=modifiye nişasta|oats=yulaf|oat=yulaf|avoine=yulaf|hafer=yulaf|avena=yulaf|oat flakes=yulaf ezmesi|rolled oats=yulaf ezmesi|barley=arpa|orge=arpa|gerste=arpa|cebada=arpa|orzo=arpa|barley malt=arpa maltı|malt=malt|malt extract=malt özütü|barley malt extract=arpa malt özütü|rye=çavdar|seigle=çavdar|roggen=çavdar|centeno=çavdar|segale=çavdar
milk=süt|lait=süt|milch=süt|leche=süt|latte=süt|whole milk=tam yağlı süt|skimmed milk=yağsız süt|skim milk=yağsız süt|milk powder=süt tozu|skimmed milk powder=yağsız süt tozu|whole milk powder=tam yağlı süt tozu|lait ecreme en poudre=yağsız süt tozu|lait en poudre=süt tozu|lait ecreme=yağsız süt|whey=peynir altı suyu|whey powder=peynir altı suyu tozu|lactoserum=peynir altı suyu|lactoserum en poudre=peynir altı suyu tozu|molke=peynir altı suyu|suero de leche=peynir altı suyu|siero di latte=peynir altı suyu|lactose=laktoz|lactose et proteines de lait=laktoz ve süt proteini|milk protein=süt proteini|casein=kazein|butter=tereyağı|beurre=tereyağı|butter=tereyağı|mantequilla=tereyağı|burro=tereyağı|cream=krema|creme=krema|sahne=krema|cheese=peynir|fromage=peynir|kase=peynir|queso=peynir|formaggio=peynir|yogurt=yoğurt|yoghurt=yoğurt|joghurt=yoğurt|butterfat=süt yağı|milk fat=süt yağı|butteroil=tereyağı
egg=yumurta|eggs=yumurta|oeuf=yumurta|oeufs=yumurta|ei=yumurta|eier=yumurta|huevo=yumurta|huevos=yumurta|uovo=yumurta|uova=yumurta|egg white=yumurta akı|egg yolk=yumurta sarısı|egg powder=yumurta tozu|dried egg=kurutulmuş yumurta|whole egg=tam yumurta|free range egg=serbest gezen tavuk yumurtası
cocoa=kakao|cacao=kakao|kakao=kakao|cocoa butter=kakao yağı|beurre de cacao=kakao yağı|kakaobutter=kakao yağı|manteca de cacao=kakao yağı|cocoa mass=kakao kitlesi|cocoa powder=kakao tozu|fat reduced cocoa=az yağlı kakao|cocoa paste=kakao hamuru|chocolate=çikolata|chocolat=çikolata|schokolade=çikolata|dark chocolate=bitter çikolata|milk chocolate=sütlü çikolata|chocolate liquor=kakao likörü|pate de cacao=kakao hamuru
hazelnut=fındık|hazelnuts=fındık|noisette=fındık|noisettes=fındık|haselnuss=fındık|haselnusse=fındık|avellana=fındık|avellanas=fındık|nocciola=fındık|nocciole=fındık|hazelnut paste=fındık ezmesi|almond=badem|almonds=badem|amande=badem|amandes=badem|mandel=badem|mandeln=badem|almendra=badem|almendras=badem|mandorla=badem|mandorle=badem|walnut=ceviz|walnuts=ceviz|noix=ceviz|walnusse=ceviz|nuez=ceviz|noce=ceviz|peanut=yer fıstığı|peanuts=yer fıstığı|arachide=yer fıstığı|arachides=yer fıstığı|erdnuss=yer fıstığı|erdnusse=yer fıstığı|cacahuete=yer fıstığı|pistachio=antep fıstığı|pistachios=antep fıstığı|pistache=antep fıstığı|cashew=kaju|cashews=kaju|coconut=hindistan cevizi|noix de coco=hindistan cevizi|nuts=kuruyemiş|tree nuts=kuruyemiş|nuts=kuruyemiş|fruits a coque=kuruyemiş|nusse=kuruyemiş|sesame=susam|sesame seeds=susam|sesam=susam|sesamo=susam|sunflower seeds=ay çekirdeği|poppy seeds=haşhaş tohumu|flaxseed=keten tohumu|linseed=keten tohumu
oil=yağ|vegetable oil=bitkisel yağ|vegetable oils=bitkisel yağlar|huile vegetale=bitkisel yağ|pflanzliches ol=bitkisel yağ|aceite vegetal=bitkisel yağ|palm oil=palm yağı|palm fat=palm yağı|huile de palme=palm yağı|palmol=palm yağı|palmfett=palm yağı|aceite de palma=palm yağı|olio di palma=palm yağı|sunflower oil=ayçiçek yağı|huile de tournesol=ayçiçek yağı|sonnenblumenol=ayçiçek yağı|aceite de girasol=ayçiçek yağı|olio di girasole=ayçiçek yağı|rapeseed oil=kanola yağı|canola oil=kanola yağı|huile de colza=kanola yağı|rapsol=kanola yağı|olive oil=zeytinyağı|huile d olive=zeytinyağı|olivenol=zeytinyağı|aceite de oliva=zeytinyağı|olio di oliva=zeytinyağı|extra virgin olive oil=naturel sızma zeytinyağı|soybean oil=soya yağı|soy oil=soya yağı|coconut oil=hindistan cevizi yağı|shea=shea yağı|palm kernel oil=palm çekirdeği yağı|hydrogenated vegetable oil=hidrojenize bitkisel yağ|fat=yağ|margarine=margarin
soy=soya|soya=soya|soja=soya|soybeans=soya fasulyesi|soy flour=soya unu|soy protein=soya proteini|soy lecithin=soya lesitini|soya lecithin=soya lesitini|lecithin=lesitin|lecithins=lesitin|lecithine=lesitin|lecithine de soja=soya lesitini|lecithine de tournesol=ayçiçek lesitini|sunflower lecithin=ayçiçek lesitini|lecitina=lesitin|lecitina de soja=soya lesitini|lecitina di soia=soya lesitini|sojalecithin=soya lesitini|soia=soya|tofu=tofu
natural flavouring=doğal aroma|natural flavoring=doğal aroma|natural flavour=doğal aroma|natural flavor=doğal aroma|natural flavours=doğal aroma|flavouring=aroma|flavoring=aroma|flavourings=aroma|flavors=aroma|flavours=aroma|flavor=aroma|flavour=aroma|aroma=aroma|aromas=aroma|aromes=aroma|arome=aroma|aromes naturels=doğal aroma|arome naturel=doğal aroma|natural aroma=doğal aroma|naturliches aroma=doğal aroma|aroma natural=doğal aroma|aromi naturali=doğal aroma|vanilla=vanilya|vanille=vanilya|vanillin=vanilin|vanillina=vanilin|vanilla extract=vanilya özütü|extrait de vanille=vanilya özütü|vanilla flavouring=vanilya aroması
emulsifier=emülgatör|emulsifiers=emülgatör|emulsifiant=emülgatör|emulsifiants=emülgatör|emulgator=emülgatör|emulgatoren=emülgatör|emulsionante=emülgatör|emulsionantes=emülgatör|raising agent=kabartıcı|raising agents=kabartıcı|baking powder=kabartma tozu|agent de levage=kabartıcı|backtriebmittel=kabartıcı|levadura=maya|yeast=maya|levure=maya|hefe=maya|lievito=maya|sodium bicarbonate=karbonat|sodium hydrogen carbonate=karbonat|ammonium hydrogen carbonate=amonyum karbonat|acidity regulator=asitlik düzenleyici|acidity regulators=asitlik düzenleyici|regulateur d acidite=asitlik düzenleyici|saureregulator=asitlik düzenleyici|acid=asit|citric acid=sitrik asit|acide citrique=sitrik asit|zitronensaure=sitrik asit|acido citrico=sitrik asit|lactic acid=laktik asit|ascorbic acid=askorbik asit (C vitamini)|acide ascorbique=askorbik asit (C vitamini)|antioxidant=antioksidan|antioxidants=antioksidan|antioxydant=antioksidan|antioxydants=antioksidan|antioxidante=antioksidan|preservative=koruyucu|preservatives=koruyucu|conservateur=koruyucu|conservateurs=koruyucu|konservierungsstoff=koruyucu|conservante=koruyucu|conservante=koruyucu|colour=renklendirici|colours=renklendirici|color=renklendirici|colorant=renklendirici|colorants=renklendirici|farbstoff=renklendirici|colorante=renklendirici|coloring=renklendirici|colouring=renklendirici|caramel=karamel|caramel color=karamel rengi|caramel colour=karamel rengi|sweetener=tatlandırıcı|sweeteners=tatlandırıcı|edulcorant=tatlandırıcı|edulcorants=tatlandırıcı|susstoff=tatlandırıcı|edulcorante=tatlandırıcı|thickener=kıvam artırıcı|thickeners=kıvam artırıcı|epaississant=kıvam artırıcı|verdickungsmittel=kıvam artırıcı|stabiliser=stabilizatör|stabilizer=stabilizatör|stabilisant=stabilizatör|stabilizers=stabilizatör|gelling agent=jelleştirici|gelatin=jelatin|gelatine=jelatin|gelatina=jelatin|pectin=pektin|pectine=pektin|pektin=pektin|agar=agar|guar gum=guar zamkı|xanthan gum=ksantan zamkı|gomme xanthane=ksantan zamkı|gomme guar=guar zamkı|locust bean gum=keçiboynuzu zamkı|carrageenan=karagenan|gum arabic=arap zamkı|gellan gum=gellan zamkı|cellulose=selüloz|glycerol=gliserin|glycerin=gliserin|glycerine=gliserin|glycerol=gliserin|mono and diglycerides of fatty acids=yağ asitlerinin mono ve digliseritleri|mono and diglycerides=mono ve digliseritler|mono- and diglycerides of fatty acids=yağ asitlerinin mono ve digliseritleri|mono-and diglycerides of fatty acids=yağ asitlerinin mono ve digliseritleri|mono et diglycerides d acides gras=yağ asitlerinin mono ve digliseritleri|mono- und diglyceride von speisefettsauren=yağ asitlerinin mono ve digliseritleri|anti caking agent=topaklanma önleyici|anticaking agent=topaklanma önleyici|glazing agent=parlatıcı|flour treatment agent=un işleme maddesi|humectant=nem tutucu|firming agent=sertleştirici|bulking agent=dolgu maddesi|acidifier=asitlendirici|acidulant=asitlendirici|enzyme=enzim|enzymes=enzim|amylase=amilaz|protein=protein|proteins=protein|fibre=lif|fiber=lif|vitamins=vitaminler|vitamin=vitamin|minerals=mineraller|iron=demir|calcium=kalsiyum|magnesium=magnezyum|zinc=çinko|niacin=niasin|riboflavin=riboflavin|thiamin=tiamin|thiamine=tiamin|folic acid=folik asit|vitamin c=C vitamini|vitamin d=D vitamini|vitamin e=E vitamini|vitamin b12=B12 vitamini|spirulina=spirulina|turmeric=zerdeçal|curcumin=kurkumin|paprika=kırmızı biber|paprika extract=kırmızı biber özütü|annatto=annatto|beetroot=pancar|betanin=betanin
tomato=domates|tomatoes=domates|tomate=domates|tomates=domates|tomaten=domates|tomate concentrate=domates salçası|tomato paste=domates salçası|tomato puree=domates püresi|onion=soğan|onions=soğan|oignon=soğan|oignons=soğan|zwiebel=soğan|cebolla=soğan|cipolla=soğan|garlic=sarımsak|ail=sarımsak|knoblauch=sarımsak|ajo=sarımsak|aglio=sarımsak|potato=patates|potatoes=patates|pomme de terre=patates|pommes de terre=patates|kartoffel=patates|kartoffeln=patates|patata=patates|carrot=havuç|carrots=havuç|carotte=havuç|carottes=havuç|karotte=havuç|pepper=biber|black pepper=karabiber|poivre=karabiber|pfeffer=karabiber|spices=baharat|spice=baharat|epices=baharat|gewurze=baharat|especias=baharat|spezie=baharat|herbs=otlar|herb=ot|parsley=maydanoz|basil=fesleğen|oregano=kekik|thyme=kekik|cumin=kimyon|cinnamon=tarçın|ginger=zencefil|mustard=hardal|moutarde=hardal|senf=hardal|vinegar=sirke|vinaigre=sirke|essig=sirke|vinagre=sirke|aceto=sirke|lemon=limon|lemon juice=limon suyu|citron=limon|jus de citron=limon suyu|zitrone=limon|zitronensaft=limon suyu|orange=portakal|orange juice=portakal suyu|jus d orange=portakal suyu|apple=elma|apple juice=elma suyu|pomme=elma|apfel=elma|manzana=elma|mela=elma|grape=üzüm|raisins=kuru üzüm|raisin=kuru üzüm|raisins secs=kuru üzüm|dates=hurma|date=hurma|datte=hurma|dattes=hurma|fig=incir|figs=incir|figue=incir|apricot=kayısı|apricots=kayısı|abricot=kayısı|abricots=kayısı|strawberry=çilek|strawberries=çilek|fraise=çilek|fraises=çilek|erdbeere=çilek|raspberry=ahududu|framboise=ahududu|banana=muz|banane=muz|bananen=muz|pineapple=ananas|mango=mango|peach=şeftali|cherry=kiraz|cherries=kiraz|blueberry=yaban mersini|blackcurrant=siyah frenk üzümü|fruit=meyve|fruits=meyve|fruit juice=meyve suyu|fruit puree=meyve püresi|fruit concentrate=meyve konsantresi|concentrated fruit juice=konsantre meyve suyu|vegetables=sebze|vegetable=sebze|legumes=baklagil|chickpeas=nohut|lentils=mercimek|lentil=mercimek|beans=fasulye|peas=bezelye|pea protein=bezelye proteini|spinach=ıspanak|cabbage=lahana|cucumber=salatalık|olive=zeytin|olives=zeytin|mushroom=mantar|mushrooms=mantar|champignons=mantar
meat=et|beef=sığır eti|pork=domuz eti|chicken=tavuk|chicken meat=tavuk eti|turkey=hindi|lamb=kuzu eti|viande=et|poulet=tavuk|boeuf=sığır eti|porc=domuz eti|fleisch=et|huhn=tavuk|carne=et|pollo=tavuk|fish=balık|poisson=balık|tuna=ton balığı|thon=ton balığı|salmon=somon|saumon=somon|anchovy=hamsi|anchovies=hamsi|shrimp=karides|crevettes=karides|ham=jambon|jambon=jambon|bacon=bakon|sausage=sosis|salami=salam
tea=çay|the=çay|coffee=kahve|cafe=kahve|kaffee=kahve|caffeine=kafein|carbon dioxide=karbondioksit|carbonated water=gazlı su|sparkling water=gazlı su|eau gazeifiee=gazlı su|mineral water=maden suyu|taurine=taurin|glucuronolactone=glukuronolakton|inositol=inositol|beetroot juice=pancar suyu|stevia=stevia|steviol glycosides=steviol glikozitler|aspartame=aspartam|sucralose=sukraloz|acesulfame k=asesülfam K|sorbitol=sorbitol|xylitol=ksilitol|erythritol=eritritol|maltitol=maltitol|polydextrose=polidekstroz|inulin=inülin|chicory root fibre=hindiba kökü lifi|chicory fibre=hindiba lifi
wholegrain=tam tahıl|whole grain=tam tahıl|whole grains=tam tahıl|cereals=tahıl|cereal=tahıl|cereales=tahıl|cereali=tahıl|cereales=tahıl|bran=kepek|wheat bran=buğday kepeği|germ=ruşeym|wheat germ=buğday ruşeymi|breadcrumbs=galeta unu|biscuit=bisküvi|biscuits=bisküvi|bread=ekmek|pasta=makarna|noodles=erişte|couscous=kuskus|bulgur=bulgur|puffed rice=pirinç patlağı|rice crispies=pirinç gevreği|crisp rice=pirinç gevreği|cocoa nibs=kakao parçacıkları|raisin juice concentrate=üzüm suyu konsantresi|salt substitute=tuz yerine geçen madde|potassium chloride=potasyum klorür|sodium chloride=sodyum klorür|iodised salt=iyotlu tuz|iodized salt=iyotlu tuz|sel iode=iyotlu tuz|jodsalz=iyotlu tuz|whole=tam|dried=kurutulmuş|powder=toz|concentrate=konsantre|puree=püre|extract=özüt|paste=ezme|flakes=gevrek|fresh=taze|roasted=kavrulmuş|ground=öğütülmüş|natural=doğal|organic=organik|bio=organik|and=ve|et=ve|und=ve|y=ve|e=ve|with=|from=|of=|de=|du=|des=|la=|le=|les=|the=|a=|an=|in=|di=|del=|der=|die=|das=|von=|con=|en=|avec=|mit=|sin=|sans=|ohne=|without=|free=|total=|min=|max=|approx=
`;

const DICT: Record<string, string> = {};
RAW.split('|').join('\n').split('\n').forEach((pair) => {
  const i = pair.indexOf('=');
  if (i > 0) DICT[pair.slice(0, i).trim()] = pair.slice(i + 1).trim();
});
const MAX_PHRASE = 8;

const E_NAMES: Record<string, string> = {
  e100: 'kurkumin', e101: 'riboflavin', e102: 'tartrazin', e120: 'karmin', e129: 'allura kırmızısı',
  e150a: 'karamel', e150c: 'karamel', e150d: 'karamel', e160a: 'karoten', e160b: 'annatto', e162: 'pancar kırmızısı', e163: 'antosiyanin',
  e170: 'kalsiyum karbonat', e200: 'sorbik asit', e202: 'potasyum sorbat', e211: 'sodyum benzoat', e220: 'kükürt dioksit',
  e250: 'sodyum nitrit', e260: 'asetik asit', e270: 'laktik asit', e282: 'kalsiyum propiyonat',
  e300: 'askorbik asit', e301: 'sodyum askorbat', e306: 'tokoferol', e322: 'lesitin', e330: 'sitrik asit', e331: 'sodyum sitrat',
  e332: 'potasyum sitrat', e333: 'kalsiyum sitrat', e334: 'tartarik asit', e339: 'sodyum fosfat', e340: 'potasyum fosfat',
  e341: 'kalsiyum fosfat', e385: 'kalsiyum EDTA', e401: 'sodyum aljinat', e406: 'agar', e407: 'karagenan', e410: 'keçiboynuzu zamkı',
  e412: 'guar zamkı', e414: 'arap zamkı', e415: 'ksantan zamkı', e416: 'karaya zamkı', e417: 'tara zamkı', e418: 'gellan zamkı', e440: 'pektin', e450: 'difosfat',
  e451: 'trifosfat', e452: 'polifosfat', e460: 'selüloz', e466: 'karboksimetil selüloz', e471: 'mono ve digliseritler', e472e: 'DATEM',
  e481: 'sodyum stearoil laktilat', e491: 'sorbitan monostearat', e500: 'sodyum karbonat', e501: 'potasyum karbonat', e503: 'amonyum karbonat',
  e508: 'potasyum klorür', e516: 'kalsiyum sülfat', e551: 'silikon dioksit', e570: 'stearik asit', e621: 'monosodyum glutamat',
  e627: 'disodyum guanilat', e631: 'disodyum inosinat', e901: 'balmumu', e903: 'karnauba mumu', e904: 'gomalak', e920: 'L-sistein',
  e938: 'argon', e948: 'oksijen', e950: 'asesülfam K', e951: 'aspartam', e955: 'sukraloz', e960: 'steviol glikozit', e965: 'maltitol', e967: 'ksilitol', e968: 'eritritol', e1422: 'modifiye nişasta', e1442: 'modifiye nişasta',
};

const TR_HINT = new Set(
  'seker tuz bugday sut yag nisasta aroma un su yumurta kakao findik yulaf misir pirinc krema tereyagi peynir yogurt tahil katki icerebilir icindekiler bitkisel ayciceg zeytin sirke baharat biber domates sogan sarimsak limon portakal elma uzum hurma incir kayisi'.split(' '),
);

export type Prepared = {
  chips: string[];
  /** Çevrilemeyen yabancı öğe sayısı */
  dropped: number;
  isTurkish: boolean;
  /** Analiz için: orijinal + Türkçeleştirilmiş metin */
  forAnalysis: string;
};

const STOP_HEAD = /^(ingredients?|ingr[eé]dients?|zutaten|ingredientes|ingredienti|i[cç]indekiler|i[cç]erik|composition|zusammensetzung|composizione|contenido)\s*[:：-]?\s*/i;
const TRACE_RE = /(may contain|can contain|traces? of|peut contenir|traces? de|kann spuren|puede contener|puo contenere|icerebilir|eser miktarda|ayni tesiste|produced in a facility|manufactured in)/;

function titleCase(s: string): string {
  const t = s.trim();
  return t ? t.charAt(0).toLocaleUpperCase('tr-TR') + t.slice(1) : t;
}

function splitTop(text: string): string[] {
  const out: string[] = [];
  let depth = 0;
  let cur = '';
  const chars = Array.from(text);
  for (let i = 0; i < chars.length; i++) {
    const ch = chars[i];
    if (ch === '(' || ch === '[') depth++;
    if (ch === ')' || ch === ']') depth = Math.max(0, depth - 1);
    const decimal = ch === ',' && /\d/.test(chars[i - 1] ?? '') && /\d/.test(chars[i + 1] ?? '');
    if ((ch === ',' || ch === ';' || ch === '•' || ch === '·') && depth === 0 && !decimal) {
      out.push(cur);
      cur = '';
    } else cur += ch;
  }
  out.push(cur);
  return out.map((s) => s.trim()).filter(Boolean);
}

function stripNoise(s: string): string {
  return s
    .replace(/[_*†‡§]/g, '')
    .replace(/\(?\s*%?\s*\d+([.,]\d+)?\s*%\s*\)?/g, ' ') // (13%) / 13 % / %13
    .replace(/%\s*\d+([.,]\d+)?/g, ' ')
    .replace(/\(\s*\)/g, '')
    .replace(/\s{2,}/g, ' ')
    .replace(/^[\s:.\-–]+|[\s:.\-–]+$/g, '')
    .trim();
}

type Tr = { text: string; ok: boolean };

function translatePhrase(raw: string): Tr {
  const words = normalize(raw)
    .replace(/[^a-z0-9\s-]/g, ' ')
    .replace(/-/g, ' ')
    .split(/\s+/)
    .filter(Boolean);
  const out: string[] = [];
  let ok = true;
  let i = 0;
  while (i < words.length) {
    const w = words[i];
    // E-kodu
    const em = w.match(/^e(\d{3,4}[a-i]?)$/);
    if (em) {
      const key = `e${em[1]}`;
      out.push(E_NAMES[key] ? `${key.toUpperCase()} (${E_NAMES[key]})` : key.toUpperCase());
      i++;
      continue;
    }
    if (/^\d+$/.test(w)) {
      i++;
      continue;
    }
    let matched = false;
    for (let n = Math.min(MAX_PHRASE, words.length - i); n >= 1; n--) {
      const key = words.slice(i, i + n).join(' ');
      let val = DICT[key];
      if (val === undefined && n === 1) {
        // çoğul eki dene
        if (w.endsWith('es')) val = DICT[w.slice(0, -2)];
        if (val === undefined && w.endsWith('s')) val = DICT[w.slice(0, -1)];
      }
      if (val !== undefined) {
        if (val) out.push(val);
        i += n;
        matched = true;
        break;
      }
    }
    if (!matched) {
      if (w.length > 2) ok = false;
      i++;
    }
  }
  // art arda tekrar eden sözcükleri temizle (ör. "kakao kakao")
  const dedup = out.filter((x, idx) => idx === 0 || x !== out[idx - 1]);
  return { text: dedup.join(' ').replace(/\s+/g, ' ').trim(), ok };
}

function translateItem(part: string): string | null {
  const cleaned = stripNoise(part);
  if (!cleaned) return null;
  // "Emülgatör: Lesitin (Soya)" ya da "Mısır (nişasta, yağ)"
  const paren = cleaned.match(/^([^(\[]*)[(\[](.*)[)\]]\s*$/);
  if (paren) {
    const main = translatePhrase(paren[1]);
    const inner = splitTop(paren[2])
      .map((x) => translatePhrase(stripNoise(x)))
      .filter((x) => x.ok && x.text);
    const innerText = inner.map((x) => x.text).join(', ');
    if (!main.ok || !main.text) return innerText ? titleCase(innerText) : null;
    return titleCase(innerText ? `${main.text} (${innerText})` : main.text);
  }
  const colon = cleaned.split(':');
  if (colon.length === 2) {
    const a = translatePhrase(colon[0]);
    const b = translatePhrase(colon[1]);
    if (a.ok && b.ok && a.text && b.text) return titleCase(`${a.text}: ${b.text}`);
    if (b.ok && b.text) return titleCase(b.text);
    return null;
  }
  const t = translatePhrase(cleaned);
  return t.ok && t.text ? titleCase(t.text) : null;
}

function looksTurkish(text: string, lang?: string): boolean {
  if (lang === 'tr') return true;
  const norm = normalize(text);
  const words = norm.split(/[^a-z0-9]+/).filter(Boolean);
  const trChars = (text.match(/[çğışöüÇĞİŞÖÜ]/g) ?? []).length;
  const trHits = words.filter((w) => TR_HINT.has(w)).length;
  const foreignHits = words.filter((w) => w.length > 2 && DICT[w] !== undefined && !TR_HINT.has(w)).length;
  if (trChars >= 2 && trHits >= foreignHits) return true;
  return trHits > foreignHits && trHits >= 2;
}

export function prepareIngredients(raw: string, lang?: string): Prepared {
  const empty: Prepared = { chips: [], dropped: 0, isTurkish: true, forAnalysis: '' };
  if (!raw || raw.trim().length < 3) return empty;
  let text = raw.replace(/\s+/g, ' ').trim().replace(STOP_HEAD, '');
  const tm = normalize(text).search(TRACE_RE);
  const main = tm > 0 ? text.slice(0, tm) : text;
  const turkish = looksTurkish(raw, lang);
  const parts = splitTop(main.replace(/\.\s*$/, ''));

  const chips: string[] = [];
  let dropped = 0;
  const seen = new Set<string>();
  for (const part of parts) {
    let item: string | null;
    if (turkish) {
      const c = stripNoise(part).replace(/[()]/g, (m) => m);
      item = c && c.length > 1 ? titleCase(c) : null;
    } else {
      item = translateItem(part);
    }
    if (!item) {
      if (!turkish) dropped++;
      continue;
    }
    const key = normalize(item);
    if (seen.has(key)) continue;
    seen.add(key);
    chips.push(item);
  }
  const translated = chips.join(', ');
  return { chips, dropped, isTurkish: turkish, forAnalysis: turkish ? raw : `${raw}. ${translated}` };
}
