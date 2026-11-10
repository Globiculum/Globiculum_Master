"""Language skills -> the NCERT chapters that practise them (T10).

English, Hindi and Sanskrit gaps in a report are skills ("Grammar", "Letter
writing"), not chapters (language_skills.py), so they had no chapter link. This
file says, for every CBSE skill, where a student practises it:

  None                 no NCERT chapter teaches it (unseen passages, exam-format
                       writing such as Class 12 letters): the report keeps its
                       YouTube search only
  ("every", file)      every chapter of the book practises it (reading,
                       listening, literature): "Every chapter of Poorvi
                       practises this. Start with: Ch 1"
  [(file, point), ...] the chapters whose exercises teach it, with the point
                       each one covers: "Ch 3: Rama to the Rescue (adjectives)"

Read from the books themselves (ncert.nic.in, Reprint 2026-27): each chapter's
exercise sections ("Let us learn", "Let us write", "भाषा की बात", "अभ्यासः"...),
the workbook Words and Expressions 2 (Class 10 English), and the books that
teach a skill outright: Abhivyakti aur Madhyam (Hindi 11-12 writing and media),
Vyakaranavithi and Abhyaswaan Bhav-II (Class 10 Sanskrit grammar and writing).
Skills are keyed by their order in language_skills.py, so a renamed skill keeps
its chapters; build_rows() fails if a skill has no entry.

topic_resources.py --skills turns this into topic_resources rows (provider
"NCERT <book>"); lib/topicLinks.ts (skillChapters) shows them in the report.
"""

from __future__ import annotations

PDF = "https://ncert.nic.in/textbook/pdf/{}.pdf"
EVERY = "every"

# NCERT file code (book + part) -> the book's name as the report shows it.
BOOKS: dict[str, str] = {
    "aemr1": "Mridang",
    "bemr1": "Mridang",
    "cesa1": "Santoor",
    "desa1": "Santoor",
    "eesa1": "Santoor",
    "fepr1": "Poorvi",
    "gepr1": "Poorvi",
    "hepr1": "Poorvi",
    "ahsr1": "Sarangi",
    "bhsr1": "Sarangi",
    "chve1": "Veena",
    "dhve1": "Veena",
    "ehve1": "Veena",
    "fhml1": "Malhar",
    "ghml1": "Malhar",
    "hhml1": "Malhar",
    "ihga1": "Ganga",
    "iebe1": "Kaveri",
    "fsde1": "Deepakam",
    "gsde1": "Deepakam",
    "hsde1": "Deepakam",
    "ihsh1": "Sharada",
    "jeff1": "First Flight",
    "jewe2": "Words and Expressions 2",
    "kehb1": "Hornbill",
    "lefl1": "Flamingo",
    "jhks1": "Kshitij",
    "khar1": "Aaroh",
    "lhar1": "Aaroh",
    "kham1": "Abhivyakti aur Madhyam",
    "jhsk1": "Shemushi",
    "jhva1": "Vyakaranavithi",
    "jsab1": "Abhyaswaan Bhav-II",
}

# Chapter file -> link text (the chapter as the book numbers it).
CH: dict[str, str] = {
    # English 1-5: Mridang, Santoor
    "aemr101": "Ch 1: Two Little Hands",
    "aemr102": "Ch 2: Greetings",
    "aemr104": "Ch 4: The Cap-seller and the Monkeys",
    "aemr108": "Ch 8: The Four Seasons",
    "bemr101": "Ch 1: My Bicycle",
    "bemr103": "Ch 3: It is Fun",
    "bemr104": "Ch 4: Seeing without Seeing",
    "bemr107": "Ch 7: This is My Town",
    "bemr108": "Ch 8: A Show of Clouds",
    "bemr110": "Ch 10: The Crow",
    "bemr112": "Ch 12: Little Drops of Water",
    "cesa101": "Ch 1: Colours",
    "cesa102": "Ch 2: Badal and Moti",
    "cesa103": "Ch 3: Best Friends",
    "cesa104": "Ch 4: Out in the Garden",
    "cesa105": "Ch 5: Talking Toys",
    "cesa106": "Ch 6: Paper Boats",
    "cesa108": "Ch 8: Thank God",
    "cesa109": "Ch 9: Madhu's Wish",
    "cesa110": "Ch 10: Night",
    "desa101": "Ch 1: Together We Can",
    "desa102": "Ch 2: The Tinkling Bells",
    "desa103": "Ch 3: Be Smart, Be Safe",
    "desa104": "Ch 4: One Thing at a Time",
    "desa105": "Ch 5: The Old Stag",
    "desa108": "Ch 8: The Lagori Champions",
    "desa109": "Ch 9: Hekko",
    "desa110": "Ch 10: The Swing",
    "desa111": "Ch 11: A Journey to the Magical Mountains",
    "eesa101": "Ch 1: Papa's Spectacles",
    "eesa102": "Ch 2: Gone with the Scooter",
    "eesa103": "Ch 3: The Rainbow",
    "eesa104": "Ch 4: The Wise Parrot",
    "eesa105": "Ch 5: The Frog",
    "eesa106": "Ch 6: What a Tank!",
    "eesa107": "Ch 7: Gilli Danda",
    "eesa108": "Ch 8: The Decision of the Panchayat",
    "eesa110": "Ch 10: Glass Bangles",
    # English 6: Poorvi's chapter files are its five units (three chapters each)
    "fepr101": "Unit 1: Fables and Folk Tales",
    "fepr102": "Unit 2: Friendship",
    "fepr103": "Unit 3: Nurturing Nature",
    "fepr104": "Unit 4: Sports and Wellness",
    "fepr105": "Unit 5: Culture and Tradition",
    "gepr101": "Unit 1: Learning Together",
    "gepr102": "Unit 2: Wit and Humour",
    "gepr103": "Unit 3: Dreams and Discoveries",
    "gepr104": "Unit 4: Travel and Adventure",
    "gepr105": "Unit 5: Bravehearts",
    "hepr101": "Unit 1: Wit and Wisdom",
    "hepr102": "Unit 2: Values and Dispositions",
    "hepr103": "Unit 3: Mystery and Magic",
    "hepr104": "Unit 4: Environment",
    "hepr105": "Unit 5: Science and Curiosity",
    # Hindi 1-7: Sarangi, Veena, Malhar
    "ahsr101": "Ch 1: मीना का परिवार",
    "bhsr101": "Ch 1: नीमा की दादी",
    "chve101": "Ch 1: सीखो",
    "chve107": "Ch 7: मित्र को पत्र",
    "chve109": "Ch 9: प्रकृति पर्व – फूलदेई",
    "chve113": "Ch 13: पेड़ों की अम्मा 'थिमक्का'",
    "dhve101": "Ch 1: चिड़िया का गीत",
    "dhve105": "Ch 5: आसमान गिरा",
    "dhve106": "Ch 6: जयपुर से पत्र",
    "dhve107": "Ch 7: नकली हीरे",
    "dhve109": "Ch 9: मिठाइयों का सम्मेलन",
    "dhve111": "Ch 11: कविता का कमाल",
    "dhve112": "Ch 12: शतरंज में मात",
    "dhve113": "Ch 13: हमारा आदित्य",
    "ehve101": "Ch 1: किरन",
    "ehve103": "Ch 3: चाँद का कुर्ता",
    "ehve105": "Ch 5: सुंदरिया",
    "ehve106": "Ch 6: चतुर चित्रकार",
    "ehve109": "Ch 9: न्याय",
    "ehve110": "Ch 10: तीन मछलियाँ",
    "fhml101": "Ch 1: मातृभूमि",
    "fhml102": "Ch 2: गोल",
    "fhml103": "Ch 3: पहली बूँद",
    "fhml104": "Ch 4: हार की जीत",
    "fhml105": "Ch 5: रहीम के दोहे",
    "fhml108": "Ch 8: सत्रिया और बिहू नृत्य",
    "fhml109": "Ch 9: मैया मैं नहिं माखन खायो",
    "fhml112": "Ch 12: हिंद महासागर में छोटा-सा हिंदुस्तान",
    "ghml101": "Ch 1: माँ, कह एक कहानी",
    "ghml102": "Ch 2: तीन बुद्धिमान",
    "ghml103": "Ch 3: फूल और काँटा",
    "ghml106": "Ch 6: गिरिधर कविराय की कुंडलिया",
    "ghml107": "Ch 7: वर्षा-बहार",
    "ghml108": "Ch 8: बिरजू महाराज से साक्षात्कार",
    "hhml101": "Ch 1: स्वदेश",
    "hhml102": "Ch 2: दो गौरैया",
    "hhml104": "Ch 4: हरिद्वार",
    "hhml105": "Ch 5: कबीर के दोहे",
    "hhml106": "Ch 6: एक टोकरी भर मिट्टी",
    "hhml107": "Ch 7: मत बाँधो",
    "hhml108": "Ch 8: नए मेहमान",
    "hhml109": "Ch 9: आदमी का अनुपात",
    # Hindi 9: Ganga
    "ihga101": "Ch 1: दो बैलों की कथा",
    "ihga102": "Ch 2: क्या लिखूँ?",
    "ihga103": "Ch 3: संवादहीन",
    "ihga104": "Ch 4: ऐसी भी बातें होती हैं",
    "ihga107": "Ch 7: मैं और मेरा देश",
    "ihga110": "Ch 10: भारती, जय, विजय करे!",
    # English 9: Kaveri (two texts per unit)
    "iebe101": "Unit 1: How I Taught My Grandmother to Read",
    "iebe102": "Unit 2: The Pot Maker",
    "iebe103": "Unit 3: Winds of Change",
    "iebe104": "Unit 4: Vitamin-M",
    "iebe105": "Unit 5: The World of Limitless Possibilities",
    "iebe106": "Unit 6: Twin Melodies",
    "iebe107": "Unit 7: Carrier of Words",
    "iebe108": "Unit 8: Follow That Dream",
    # Sanskrit 8: Deepakam's last part is a grammar section and tables of forms
    "hsde101": "Ch 1: संगच्छध्वं संवदध्वम्",
    "hsde102": "Ch 2: अल्पानामपि वस्तूनां संहतिः कार्यसाधिका",
    "hsde106": "Ch 6: डिजिभारतम् – युगपरिवर्तनम्",
    "hsde108": "Ch 8: पश्यत कोणमैशान्यं भारतस्य मनोहरम्",
    "hsde114": "व्याकरणम् (grammar section)",
    "hsde115": "शब्दरूपाणि (table of noun forms)",
    "hsde116": "धातुरूपाणि (table of verb forms)",
    # Sanskrit 9: Sharada (appendices 4-5 tabulate noun and verb forms)
    "ihsh101": "Ch 1: सत्यं शिवं सुन्दरं संस्कृतम्",
    "ihsh103": "Ch 3: आत्मवत्सर्वभूतेषु यः पश्यति सः पण्डितः",
    "ihsh104": "Ch 4: न खलु वयस्तेजसो हेतुः",
    "ihsh107": "Ch 7: उपायं चिन्तयेत् प्राज्ञस्तथापायं च चिन्तयेत्",
    "ihsh108": "Ch 8: अन्नाद् आनन्दं प्रति",
    "ihsh109": "Ch 9: कृतं प्रतिकृतं भूयादेष धर्मः सनातनः",
    "ihsh115": "Appendix 4: शब्दरूपाणि",
    "ihsh116": "Appendix 5: धातुरूपाणि",
    # Sanskrit 6-7: Deepakam (Class 7's appendices tabulate noun and verb forms)
    "fsde101": "Ch 1: वयं वर्णमालां पठामः",
    "fsde102": "Ch 2: संयुक्त-व्यञ्जनानि",
    "fsde103": "Ch 3: एषः कः? एषा का? एतत् किम्?",
    "fsde104": "Ch 4: अहं च त्वं च",
    "fsde105": "Ch 5: सङ्ख्यागणना ननु सरला",
    "fsde106": "Ch 6: अहं प्रातः उत्तिष्ठामि",
    "fsde107": "Ch 7: शूराः वयं धीराः वयम्",
    "fsde110": "Ch 10: बुद्धिः सर्वार्थसाधिका",
    "fsde111": "Ch 11: यो जानाति सः पण्डितः",
    "fsde113": "Ch 13: पृथिव्यां त्रीणि रत्नानि",
    "fsde114": "Ch 14: आलस्यं हि मनुष्याणां शरीरस्थो महान् रिपुः",
    "fsde116": "Ch 16: वृक्षाः सत्पुरुषाः इव",
    "gsde101": "Ch 1: वन्दे भारतमातरम्",
    "gsde102": "Ch 2: नित्यं पिबामः सुभाषितरसम्",
    "gsde105": "Ch 5: सेवा हि परमो धर्मः",
    "gsde106": "Ch 6: क्रीडाम वयं श्लोकान्त्याक्षरीम्",
    "gsde107": "Ch 7: ईशावास्यम् इदं सर्वम्",
    "gsde111": "Ch 11: द्वीपेषु रम्यः द्वीपोऽण्डमानः",
    "gsde112": "Ch 12: वीराङ्गना पन्नाधाया",
    "gsde114": "Appendix 1: शब्दरूपाणि",
    "gsde115": "Appendix 2: धातुरूपाणि",
    # English 10: First Flight and its workbook (one unit per First Flight chapter)
    "jeff101": "Ch 1: A Letter to God",
    "jeff109": "Ch 9: The Proposal",
    "jewe201": "Unit 1: A Letter to God",
    "jewe202": "Unit 2: Nelson Mandela",
    "jewe203": "Unit 3: Two Stories about Flying",
    "jewe205": "Unit 5: Glimpses of India",
    "jewe206": "Unit 6: Mijbil the Otter",
    "jewe207": "Unit 7: Madam Rides the Bus",
    "jewe208": "Unit 8: The Sermon at Benares",
    # English 11: Hornbill (its last part teaches writing skills)
    "kehb101": "Ch 1: The Portrait of a Lady",
    "kehb103": "Ch 3: Discovering Tut",
    "kehb104": "Ch 4: The Ailing Planet",
    "kehb105": "Ch 5: The Adventure",
    "kehb106": "Ch 6: Silk Road",
    "kehb111": "Writing Skills 1: Note-making",
    "kehb112": "Writing Skills 2: Summarising",
    # English 12: Flamingo
    "lefl101": "Ch 1: The Last Lesson",
    "lefl102": "Ch 2: Lost Spring",
    "lefl107": "Ch 7: The Interview",
    # Hindi 10-12
    "jhks101": "Ch 1: पद (सूरदास)",
    "jhks102": "Ch 2: राम-लक्ष्मण-परशुराम संवाद",
    "jhks107": "Ch 7: नेताजी का चश्मा",
    "jhks108": "Ch 8: बालगोबिन भगत",
    "jhks109": "Ch 9: लखनवी अंदाज़",
    "jhks110": "Ch 10: एक कहानी यह भी",
    "jhks111": "Ch 11: नौबतखाने में इबादत",
    "khar101": "Ch 1: नमक का दारोगा",
    "lhar101": "Ch 1: आत्म-परिचय (हरिवंश राय बच्चन)",
    "kham101": "Ch 1: जनसंचार माध्यम",
    "kham102": "Ch 2: पत्रकारिता के विविध आयाम",
    "kham103": "Ch 3: विभिन्न माध्यमों के लिए लेखन",
    "kham104": "Ch 4: पत्रकारीय लेखन के विभिन्न रूप और लेखन प्रक्रिया",
    "kham105": "Ch 5: विशेष लेखन – स्वरूप और प्रकार",
    "kham107": "Ch 7: नाटक लिखने का व्याकरण",
    "kham109": "Ch 9: डायरी लिखने की कला",
    "kham110": "Ch 10: कथा-पटकथा",
    "kham111": "Ch 11: कैसे करें कहानी का नाट्य रूपांतरण",
    "kham112": "Ch 12: कैसे बनता है रेडियो नाटक",
    "kham113": "Ch 13: नए और अप्रत्याशित विषयों पर लेखन",
    "kham114": "Ch 14: कार्यालयी लेखन और प्रक्रिया",
    "kham115": "Ch 15: स्ववृत्त (बायोडेटा) लेखन और रोज़गार संबंधी आवेदन पत्र",
    # Sanskrit 10
    "jhsk101": "Ch 1: शुचिपर्यावरणम्",
    "jhva103": "Ch 3: सन्धि",
    "jhva108": "Ch 8: प्रत्यय",
    "jhva109": "Ch 9: समास",
    "jhva111": "Ch 11: वाच्य",
    "jsab101": "Ch 1: अपठितावबोधनम्",
    "jsab102": "Ch 2: पत्रलेखनम्",
    "jsab103": "Ch 3: अनुच्छेदलेखनम्",
    "jsab104": "Ch 4: चित्रवर्णनम्",
    "jsab105": "Ch 5: रचनानुवादः",
    "jsab106": "Ch 6: सन्धिः",
    "jsab107": "Ch 7: समासः",
    "jsab108": "Ch 8: प्रत्ययाः",
    "jsab110": "Ch 10: समयः",
    "jsab111": "Ch 11: वाच्यम्",
    "jsab112": "Ch 12: अशुद्धिसंशोधनम्",
}

Spec = None | tuple[str, str] | list[tuple[str, str]]

# (subject as in language_skills.py, class) -> {skill order: where it is practised}
SKILLS: dict[tuple[str, int], dict[int, Spec]] = {
    ("English", 1): {
        1: (EVERY, "aemr101"),                               # Listening and speaking
        2: [("aemr102", "letters and their sounds"), ("aemr104", "starting sounds and syllables")],  # Phonics
        3: (EVERY, "aemr101"),                               # Vocabulary: words and pictures
        4: [("aemr101", None), ("aemr102", None), ("aemr108", None)],  # Rhymes and poems
        5: (EVERY, "aemr104"),                               # Story comprehension
        6: (EVERY, "aemr101"),                               # Early writing
    },
    ("English", 2): {
        1: (EVERY, "bemr101"),                               # Listening and speaking
        2: [("bemr101", None), ("bemr103", None), ("bemr108", None), ("bemr112", None)],  # Rhymes and poems
        3: (EVERY, "bemr104"),                               # Story comprehension
        4: None,                                             # Vocabulary: describing words (not taught as such)
        5: [("bemr110", "pronouns")],                        # Grammar: pronouns and prepositions
        6: [("bemr103", "making sentences"), ("bemr107", "framing sentences")],  # Sentence writing
    },
    ("English", 3): {
        1: (EVERY, "cesa101"),                               # Listening and speaking
        2: [("cesa101", None), ("cesa104", None), ("cesa110", None)],  # Reading aloud and recitation
        3: (EVERY, "cesa102"),                               # Reading comprehension
        4: [("cesa108", "opposites")],                       # Vocabulary: opposites and subject words
        5: [("cesa101", "action words"), ("cesa102", "-ed words for the past"), ("cesa103", "a and an"),
            ("cesa105", "describing words"), ("cesa106", "position words")],  # Grammar and punctuation
        6: [("cesa103", "a few lines about a friend"), ("cesa106", "a few lines about a picture"),
            ("cesa109", "completing a story")],              # Writing and dictation
    },
    ("English", 4): {
        1: (EVERY, "desa101"),                               # Listening and speaking
        2: [("desa101", None), ("desa104", None), ("desa110", None)],  # Reading aloud and recitation
        3: (EVERY, "desa102"),                               # Reading comprehension
        4: [("desa108", "words with the same meaning"), ("desa109", "their or there"),
            ("desa111", "using a dictionary")],              # Vocabulary and dictionary skills
        5: [("desa102", "comparing with -er and -est"), ("desa105", "adverbs"),
            ("desa108", "capital letters, full stops, question marks"), ("desa110", "prepositions"),
            ("desa111", "conjunctions")],                    # Grammar and punctuation
        6: [("desa103", "letter"), ("desa104", "paragraph on a daily routine"), ("desa105", "dialogues"),
            ("desa110", "short paragraph")],                 # Writing
    },
    ("English", 5): {
        1: (EVERY, "eesa101"),                               # Listening and speaking
        2: (EVERY, "eesa102"),                               # Reading comprehension
        3: [("eesa103", "opposites"), ("eesa107", "using a dictionary")],  # Vocabulary: synonyms and antonyms
        4: [("eesa102", "adverbs of frequency"), ("eesa104", "collective nouns"), ("eesa107", "abstract nouns"),
            ("eesa108", "prepositions"), ("eesa110", "simple past")],  # Grammar
        5: [("eesa103", "paragraph"), ("eesa105", "message"), ("eesa108", "letter"),
            ("eesa110", "paragraph with punctuation")],      # Paragraph and letter writing
        6: [("eesa101", "a story"), ("eesa106", "poster")],  # Creative writing
    },
    ("English", 6): {
        1: (EVERY, "fepr101"),                               # Listening and speaking
        2: (EVERY, "fepr101"),                               # Reading comprehension
        3: [("fepr104", "Yoga – A Way of Life"), ("fepr105", "Hamara Bharat – Incredible India!")],  # Reading for information
        4: [("fepr101", "homophones"), ("fepr102", "suffixes"), ("fepr105", "synonyms, antonyms, dictionary")],  # Vocabulary
        5: [("fepr101", "present continuous, adverbs"), ("fepr102", "past tenses"),
            ("fepr103", "helping verbs and modals"), ("fepr104", "past perfect"),
            ("fepr105", "simple present, pronouns")],        # Grammar
        6: [("fepr102", "paragraph"), ("fepr103", "message"), ("fepr104", "diary entry, notice"),
            ("fepr105", "paragraph")],                       # Writing
        7: (EVERY, "fepr101"),                               # Reading literature
    },
    ("English", 7): {
        1: (EVERY, "gepr101"),                               # Listening and speaking
        2: (EVERY, "gepr101"),                               # Reading aloud and recitation (a poem in every unit)
        3: (EVERY, "gepr101"),                               # Reading comprehension
        4: [("gepr104", "using a dictionary")],              # Study and reference skills
        5: [("gepr101", "nouns, prepositions and adverbs"), ("gepr102", "present perfect"),
            ("gepr103", "past perfect, conjunctions, phrasal verbs"), ("gepr104", "punctuation"),
            ("gepr105", "prefixes, subordinating conjunctions")],  # Grammar
        6: [("gepr102", "notice"), ("gepr103", "paragraph"), ("gepr104", "descriptive paragraph"),
            ("gepr105", "letter to a friend")],              # Writing
        7: [("gepr102", "dialogue"), ("gepr105", "rewriting dialogue")],  # Creative writing
    },
    ("English", 8): {
        1: (EVERY, "hepr101"),                               # Listening and speaking
        2: [("hepr101", "staging a script"), ("hepr104", "role-play")],  # Presentation and performance
        3: (EVERY, "hepr101"),                               # Reading comprehension
        4: [("hepr102", "synonyms and antonyms"), ("hepr103", "using a dictionary"),
            ("hepr105", "suffixes -ish, -ship, -ment")],     # Vocabulary and reference skills
        5: [("hepr101", "if-clauses"), ("hepr103", "reported speech"), ("hepr104", "past tenses"),
            ("hepr105", "progressive tenses")],              # Grammar
        6: [("hepr104", "punctuating a paragraph"), ("hepr105", "three-paragraph writing")],  # Paragraph writing and editing
        7: [("hepr102", "letter of enquiry, diary entry"), ("hepr103", "formal letter")],  # Functional writing
        8: (EVERY, "hepr101"),                               # Responding to literature
    },
    # Hindi 1-2: Sarangi teaches letters, sounds and reading through every lesson.
    ("Hindi", 1): {1: (EVERY, "ahsr101"), 2: (EVERY, "ahsr101"), 3: (EVERY, "ahsr101"), 4: (EVERY, "ahsr101"),
                   5: (EVERY, "ahsr101")},
    ("Hindi", 2): {1: (EVERY, "bhsr101"), 2: (EVERY, "bhsr101"), 3: (EVERY, "bhsr101"), 4: (EVERY, "bhsr101"),
                   5: (EVERY, "bhsr101")},
    ("Hindi", 3): {
        1: (EVERY, "chve101"),                               # Listening and speaking
        2: (EVERY, "chve101"),                               # Matras and word reading
        3: (EVERY, "chve101"),                               # Reading comprehension
        4: (EVERY, "chve101"),                               # Vocabulary and dictionary use
        5: [("chve109", "विराम चिह्न")],                       # Punctuation
        6: [("chve107", "पत्र"), ("chve113", "पत्र")],          # Writing
    },
    ("Hindi", 4): {
        1: (EVERY, "dhve101"),                               # Listening and speaking
        2: (EVERY, "dhve101"),                               # Reading comprehension
        3: [("dhve113", "स्त्रीलिंग और पुल्लिंग")],              # Grammar: nouns and gender
        4: [("dhve105", "मुहावरे"), ("dhve109", "मुहावरे")],      # Vocabulary
        5: [("dhve105", "विराम चिह्न"), ("dhve111", "विराम चिह्न")],  # Punctuation
        6: [("dhve106", "पत्र"), ("dhve107", "अनुच्छेद"), ("dhve112", "संवाद")],  # Writing
    },
    ("Hindi", 5): {
        1: (EVERY, "ehve101"),                               # Listening and speaking
        2: (EVERY, "ehve101"),                               # Reading comprehension
        3: [("ehve103", "संज्ञा, सर्वनाम, विशेषण"), ("ehve106", "सर्वनाम"),
            ("ehve110", "एकवचन और बहुवचन")],                  # Grammar: pronouns, adjectives and number
        4: [("ehve109", "मुहावरे और लोकोक्तियाँ"), ("ehve105", "शब्दकोश")],  # Vocabulary
        5: [("ehve105", "पत्र")],                             # Writing
        6: (EVERY, "ehve101"),                               # Creative expression
    },
    ("Hindi", 6): {
        1: (EVERY, "fhml101"),                               # Listening and speaking
        2: (EVERY, "fhml101"),                               # Reading comprehension
        3: [("fhml104", "विशेषण"), ("fhml112", "सर्वनाम")],     # Grammar: verbs and tense
        4: [("fhml104", "मुहावरे"), ("fhml112", "शब्दकोश")],    # Vocabulary and dictionary use
        5: [("fhml108", "पत्र"), ("fhml102", "डायरी"), ("fhml112", "अनुच्छेद, सूचना")],  # Writing
        6: [("fhml101", None), ("fhml103", None), ("fhml105", None), ("fhml109", None)],  # Appreciating poetry
    },
    ("Hindi", 7): {
        1: (EVERY, "ghml101"),                               # Listening and speaking
        2: (EVERY, "ghml101"),                               # Reading comprehension
        3: [("ghml106", "भूतकाल"), ("ghml108", "उपसर्ग और प्रत्यय")],  # Grammar and usage
        4: [("ghml103", "मुहावरे")],                          # Idioms and proverbs
        5: [("ghml101", "संवाद"), ("ghml102", "सूचना"), ("ghml107", "अनुच्छेद"), ("ghml108", "डायरी")],  # Writing
        6: (EVERY, "ghml101"),                               # Literature appreciation
    },
    ("Hindi", 8): {
        1: (EVERY, "hhml101"),                               # Listening and speaking
        2: (EVERY, "hhml101"),                               # Reading comprehension
        3: [("hhml102", "क्रियाविशेषण"), ("hhml104", "संज्ञा, वचन"), ("hhml107", "विराम चिह्न"),
            ("hhml109", "विशेषण")],                          # Grammar and usage
        4: [("hhml106", "मुहावरे"), ("hhml108", "मुहावरे")],   # Idioms, proverbs and word formation
        5: [("hhml107", "पत्र"), ("hhml105", "निबंध"), ("hhml108", "संवाद, संदेश"), ("hhml106", "डायरी")],  # Writing
        6: (EVERY, "hhml101"),                               # Literature appreciation
    },
    ("Hindi", 9): {
        1: None,                                             # Unseen passages
        2: [("ihga102", "समास"), ("ihga107", "उपसर्ग और प्रत्यय"), ("ihga110", "समास")],  # Word formation and sandhi
        3: [("ihga103", "अर्थ के आधार पर वाक्य")],             # Sentence types by meaning
        4: [("ihga101", "पत्र"), ("ihga104", "अनुच्छेद")],      # Letters and paragraphs
        5: [("ihga101", "संवाद"), ("ihga107", "विज्ञापन, संदेश")],  # Notices, messages and dialogue
        6: (EVERY, "ihga101"),                               # Literature
    },
    ("English", 9): {
        1: (EVERY, "iebe101"),                               # Listening skills
        2: (EVERY, "iebe101"),                               # Speaking skills
        3: (EVERY, "iebe101"),                               # Reading comprehension
        4: [("iebe103", "metaphor"), ("iebe107", "alliteration and metaphor")],  # Literature appreciation
        5: [("iebe108", "e-mail")],                          # Writing
        6: [("iebe106", "play script")],                     # Creative writing
        7: [("iebe101", "simple past and past perfect"), ("iebe102", "noun clauses"),
            ("iebe103", "present perfect"), ("iebe105", "modals, reported speech"),
            ("iebe106", "reported speech")],                 # Grammar and editing
        8: [("iebe104", "synonyms and antonyms")],           # Vocabulary
    },
    ("Sanskrit", 8): {
        1: (EVERY, "hsde101"),                               # Reading comprehension
        2: [("hsde114", None)],                              # Sandhi
        3: [("hsde102", "क्त्वा, ल्यप्"), ("hsde106", "प्रत्यय"), ("hsde108", "तुमुन्")],  # Suffixes (pratyaya)
        4: [("hsde115", None), ("hsde116", None)],           # Word and verb forms
        5: None,                                             # Writing and translation
        6: (EVERY, "hsde101"),                               # Subhashitas and literature
    },
    ("Sanskrit", 9): {
        1: None,                                             # Unseen passage
        2: None,                                             # Letter writing and picture description
        3: [("ihsh103", "अनुच्छेदपूर्तिः")],                    # Translation and composition
        4: [("ihsh109", "सन्धि"), ("ihsh103", "ल्यप्"), ("ihsh107", "क्तवतु")],  # sandhi and pratyaya
        5: [("ihsh115", None), ("ihsh116", None), ("ihsh104", "लङ् लकार"), ("ihsh108", "लट्, लोट् लकार")],  # forms, numbers, time
        6: (EVERY, "ihsh101"),                               # Prescribed text
    },
    ("Sanskrit", 6): {
        1: [("fsde101", None), ("fsde102", None)],           # Script and pronunciation
        2: [("fsde103", "एषः, एषा, एतत्"), ("fsde104", "अहम्, त्वम्"), ("fsde107", "वयम्")],  # Basic sentences and pronouns
        3: [("fsde104", None), ("fsde111", None), ("fsde114", None)],  # Word forms
        4: [("fsde104", "पुरुष और वचन"), ("fsde110", "लट् लकार")],  # Verb forms
        5: [("fsde105", "सङ्ख्या"), ("fsde106", "समय")],       # Numbers and time
        6: [("fsde113", "श्लोकाः"), ("fsde114", None), ("fsde116", None)],  # Reading and recitation
    },
    ("Sanskrit", 7): {
        1: (EVERY, "gsde101"),                               # Reading comprehension
        2: [("gsde114", None)],                              # Word forms
        3: [("gsde115", None), ("gsde107", "लृट् लकार"), ("gsde112", "लङ् लकार")],  # Verb forms and tenses
        4: [("gsde105", "अव्यय"), ("gsde111", "अव्यय")],      # Indeclinables and numbers
        5: [("gsde102", None), ("gsde106", None)],           # Subhashitas and recitation
        6: [("gsde101", "अनुवाद")],                          # Writing and translation
    },
    ("English", 10): {
        1: (EVERY, "jewe201"),                               # Listening and speaking
        2: (EVERY, "jewe201"),                               # Reading comprehension
        3: (EVERY, "jeff101"),                               # Literature appreciation
        4: [("jewe201", "the writing process"), ("jewe202", "interview and speech"),
            ("jewe203", "article"), ("jewe206", "paragraph")],  # Writing
        5: None,                                             # Note-making and summarising
        6: [("jewe201", "relative clauses"), ("jewe202", "articles"), ("jewe203", "phrasal verbs"),
            ("jewe205", "-ing and -ed adjectives"), ("jewe206", "noun modifiers"),
            ("jewe208", "reported speech")],                 # Grammar
        7: [("jewe201", "words with 'light'"), ("jewe203", "forming adverbs"),
            ("jewe206", "synonyms"), ("jewe208", "antonyms")],  # Vocabulary and idioms
        8: [("jeff109", "a one-act play to perform")],       # Creative and script writing
    },
    ("English", 11): {
        1: (EVERY, "kehb101"),                               # Reading comprehension
        2: [("kehb111", None), ("kehb112", None)],           # Note-making and summarising
        3: [("kehb101", "past perfect"), ("kehb103", "adjective collocations"),
            ("kehb105", "if-clauses for unreal conditions"), ("kehb106", "active and passive voice")],  # Grammar and usage
        4: [("kehb104", "posters")],                         # Functional writing: advertisements and posters
        5: None,                                             # Persuasive writing: speech and debate
        6: None,                                             # Listening and speaking skills
        7: (EVERY, "kehb101"),                               # Critical reading of literature
    },
    ("English Core", 12): {
        1: (EVERY, "lefl101"),                               # Reading comprehension
        2: [("lefl101", "notice")],                          # Functional writing: notices and invitations
        3: None,                                             # Letter writing
        4: [("lefl107", "report of an interview"), ("lefl102", "note-making and reporting")],  # Article and report writing
        5: None,                                             # Listening and speaking skills
        6: (EVERY, "lefl101"),                               # Critical reading of literature
    },
    # Kshitij's "भाषा-अध्ययन" exercises cover the grammar; Class 10 writing is not in the NCERT books.
    ("Hindi", 10): {
        1: None,                                             # Unseen passages
        2: [("jhks111", "मिश्र वाक्य"), ("jhks107", "कर्मवाच्य")],  # Sentence types and voice
        3: [("jhks102", "अलंकार"), ("jhks108", "क्रियाविशेषण"), ("jhks109", "क्रियापद और क्रिया-भेद"),
            ("jhks110", "मुहावरे")],                          # Parsing, figures of speech and idioms
        4: None,                                             # Letters, paragraphs and e-mails
        5: None,                                             # Advertisements, notices and messages
        6: (EVERY, "jhks101"),                               # Literature
    },
    ("Hindi", 11): {
        1: None,                                             # Unseen passages
        2: [("kham113", None)],                              # Creative writing on unseen topics
        3: [("kham114", "कार्यालयी पत्र"), ("kham115", "आवेदन पत्र")],  # Formal letter writing
        4: [("kham101", None), ("kham102", None)],           # Mass media and journalism
        5: [("kham109", None), ("kham110", None), ("kham114", None), ("kham115", None)],  # Practical writing
        6: (EVERY, "khar101"),                               # Literature (Aaroh, Vitan)
        7: None,                                             # Listening and speaking
    },
    ("Hindi", 12): {
        1: None,                                             # Unseen passages
        2: [("kham113", None)],                              # Writing on new and unexpected topics
        3: [("kham103", None)],                              # Writing for different media
        4: [("kham104", None), ("kham105", None)],           # Journalistic and special writing
        5: [("kham111", None), ("kham112", None), ("kham107", None)],  # Drama writing
        6: (EVERY, "lhar101"),                               # Literature (Aaroh, Vitan)
        7: None,                                             # Listening and speaking
    },
    ("Sanskrit", 10): {
        1: [("jsab101", None)],                              # Unseen passage
        2: [("jsab102", None), ("jsab104", None)],           # Letter writing and picture description
        3: [("jsab105", None), ("jsab103", None)],           # Translation and composition
        4: [("jsab106", None), ("jsab107", None), ("jhva103", None), ("jhva109", None)],  # sandhi and samasa
        5: [("jsab108", None), ("jsab111", None), ("jsab110", None), ("jsab112", None)],  # pratyaya, voice, time
        6: (EVERY, "jhsk101"),                               # Prescribed text
    },
}


def book_of(file: str) -> str:
    return BOOKS[file[:-2]]


def build_rows() -> list[dict]:
    """topic_resources rows for every skill with chapters; checks every CBSE skill has an entry."""
    from language_skills import build_nodes

    skills: dict[tuple[str, int], dict[int, str]] = {}
    for n in build_nodes():
        if n["curriculum_system"] != "ncert-cbse":
            continue
        m = n["metadata"]
        skills.setdefault((m["subject"], n["grade_level_min"]), {})[m["skill_order"]] = n["name"]

    problems = []
    rows: list[dict] = []
    for (subject, grade), specs in SKILLS.items():
        names = skills.get((subject, grade))
        if not names:
            problems.append(f"{subject} {grade}: no such skill set")
            continue
        missing = sorted(set(names) - set(specs))
        extra = sorted(set(specs) - set(names))
        if missing or extra:
            problems.append(f"{subject} {grade}: skills without an entry {missing}, entries without a skill {extra}")
        for order, spec in specs.items():
            if spec is None or order not in names:
                continue
            entries = [(spec[1], None)] if isinstance(spec, tuple) else spec
            for file, point in entries:
                if file not in CH or file[:-2] not in BOOKS:
                    problems.append(f"{subject} {grade} skill {order}: no label or book for {file}")
                    continue
                label = CH[file] + (f" ({point})" if point else "")
                rows.append({
                    "board": "cbse", "grade": grade, "subject": subject, "topic": names[order],
                    "resource_type": "textbook", "provider": f"NCERT {book_of(file)}",
                    "title": f"Every chapter: {label}" if isinstance(spec, tuple) else label,
                    "url": PDF.format(file),
                })
    covered = {k for k in SKILLS}
    for key in sorted(set(skills) - covered):
        problems.append(f"{key[0]} {key[1]}: no entry in SKILLS")
    if problems:
        raise SystemExit("skill_chapters.py:\n  " + "\n  ".join(problems))
    return rows
