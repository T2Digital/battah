
export const MAIN_CATEGORIES = ['قطع غيار', 'كماليات و إكسسوارات', 'زيوت وشحومات', 'بطاريات', 'إطارات'];

export const SUB_CATEGORIES: { [key: string]: string[] } = {
    'قطع غيار': ['فلاتر', 'سيور', 'بوجيهات', 'تيل فرامل', 'مساعدين', 'بطاحات'],
    'كماليات و إكسسوارات': ['دواسات', 'معطرات', 'اكسسوارات'],
    'زيوت وشحومات': ['زيت محرك', 'زيت فتيس', 'شحم'],
    'بطاريات': ['بطاريات سائلة', 'بطاريات جافة'],
    'إطارات': ['إطارات صيفي', 'إطارات شتوي'],
};

export const BRANDS = ['Bosch', 'Mann-Filter', 'NGK', 'Brembo', 'Sachs', 'Lemförder', 'Total', 'Mobil', 'Varta', 'Hankook'];

export const BRANCH_NAMES: Record<string, string> = {
    'main': 'المخزن',
    'branch1': 'الرئيسي',
    'branch2': 'فرع 1',
    'branch3': 'فرع 2'
};
