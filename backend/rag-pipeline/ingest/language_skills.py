"""Languages as SKILLS: English (CBSE I-XII, ISC XI-XII), Hindi (CBSE I-X) and
Sanskrit (CBSE VI-X).

Hindi and Sanskrit: their nodes are chapter and poem titles in Devanagari, and
no source curriculum teaches either language, so every chapter became a gap
with a chapter link - a list a newcomer to the language can't act on. The
skill sets below say what a student of each class is expected to be able to
do (read the script, use matras, write a paragraph, use idioms...), ordered
from the basics up, which is also the order the report lists them in.

English - why: both boards' English nodes in the database are prescribed literature
(Hornbill / Snapshots / Flamingo / Vistas chapters, ISC poems and plays, and
for Classes I-X the Mridang / Santoor / Poorvi / Kaveri / First Flight
chapters plus textbook headings such as "Check Your Understanding"). A US
student's English standards are skills (comprehension, argument writing,
language use), so chapter titles like "The Proposal" or "Silk Road" never match
anything and English always scored 0%, with chapter titles listed as the top
gaps. These nodes describe what each board actually examines in English, so the
comparison is skill against skill. Literature is kept as ONE skill (critical
reading of prose, poetry and drama) rather than one gap per chapter.

The gap engine uses these nodes instead of the chapter nodes wherever they
exist: see preferLanguageSkillNodes() in supabase/functions/_shared/curriculumGaps.ts,
which keys on metadata.component == "language-skills".

Sources:
  ISC  - ISC 2027 English (801) regulations: Paper I (composition, directed
         writing, proposal writing, grammar, comprehension and summary) and
         Paper II project work (listening, speaking). backend/data/ISC/text/english.txt
  CBSE - CBSE English Core (301) curriculum: Section A reading skills,
         Section B grammar and creative writing, Section C literature, plus the
         internal Assessment of Listening and Speaking.
  CBSE I-VIII - NCERT "Learning Outcomes at the Elementary Stage" (2017),
         English, class-wise learning outcomes.
  CBSE IX-X   - NCERT secondary-stage learning outcomes for English (2019), as
         published in CBSE's "Learning Standards Framework - English"
         (cbseacademic.nic.in/cbe/documents/Learning_Standards_English.pdf).
  Hindi I-VIII - NCERT "Learning Outcomes at the Elementary Stage" (2017), Hindi.
  Hindi IX-X   - CBSE Hindi Course A (002) / Course B (085) curriculum: unseen
         passages, applied grammar, writing, and the prescribed literature.
  Sanskrit VI-VIII - NCERT Sanskrit learning outcomes and the Deepakam / Ruchira
         textbooks (script, word and verb forms, sandhi, pratyaya, translation).
  Sanskrit IX-X    - CBSE Sanskrit (122) curriculum: apathita-avabodhanam,
         rachanatmaka-karyam, anuprayukta-vyakaranam, pathita-avabodhanam.
  Each class's skills paraphrase that class's outcomes, so the descriptions get
  harder from class to class even where the skill names repeat.

Usage (from backend/rag-pipeline/):
    python ingest/language_skills.py --dry-run
    python ingest/language_skills.py            # insert, then embed the new nodes
"""

from __future__ import annotations

import argparse
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
sys.path.insert(0, str(Path(__file__).resolve().parent))

from subject_streams import subject_streams  # noqa: E402

COMPONENT = "language-skills"

# (curriculum_system, subject label used by that board's existing nodes,
#  grade_min, grade_max, source_id prefix, board label, skills[(name, description)])
SKILL_SETS: list[tuple[str, str, int, int, str, str, list[tuple[str, str]]]] = [
    ("isc-cisce", "English", 11, 12, "ISC-ENGSKILL-11-12", "ISC", [
        ("Composition writing",
         "Write a 400-450 word composition: narrative, descriptive, reflective, "
         "argumentative/persuasive or expository essay, or an original short story. "
         "Range and accuracy of vocabulary, sentence structure, grammar, punctuation "
         "and spelling; organising ideas across paragraphs."),
        ("Directed writing",
         "Write a 250-300 word piece from given information and points: feature "
         "article, book review, blog, newspaper report or statement of purpose, in "
         "the correct format; amplifying, describing and restating for a purpose and audience."),
        ("Proposal writing",
         "Write a formal proposal for a given situation with a heading, objectives, "
         "a list of measures to be taken and a concluding statement."),
        ("Functional grammar and usage",
         "Transformation of sentences, phrasal verbs, verb forms and tenses; "
         "correct functional English grammar and sentence structure."),
        ("Reading comprehension",
         "Read an unseen passage of about 700 words; understand content, infer "
         "information and meaning, analyse the text and explain vocabulary in context."),
        ("Summary writing",
         "Identify the main ideas of a passage and write a coherent summary within "
         "a word limit, in complete sentences."),
        ("Listening skills",
         "Listen to an unseen passage read aloud, take brief notes and answer "
         "questions testing listening comprehension."),
        ("Speaking skills",
         "Give an individual presentation and discuss it: narrating an experience, "
         "giving instructions, describing, reporting and expressing an opinion with "
         "fluency, vocabulary and confidence."),
        ("Critical reading of literature",
         "Comprehend, analyse and appreciate prescribed prose, poetry and drama: "
         "themes, characters, context, and stylistic and literary features, "
         "supported by close reference to the text."),
    ]),
    ("ncert-cbse", "English", 11, 11, "NCERT-ENGSKILL-11", "CBSE", [
        ("Reading comprehension",
         "Read unseen factual, descriptive, discursive and literary passages; "
         "understand, interpret and infer meaning, and work out vocabulary in context."),
        ("Note-making and summarising",
         "Make notes from a passage with headings, sub-headings and abbreviations, "
         "and write a summary of its main ideas."),
        ("Grammar and usage",
         "Gap filling with correct tenses and clauses; re-ordering words into "
         "sentences and transformation of sentences."),
        ("Functional writing: advertisements and posters",
         "Write classified and display advertisements and posters with the right "
         "format, content and concise language."),
        ("Persuasive writing: speech and debate",
         "Write a speech and a debate on a given topic, building an argument with "
         "reasons and examples in an appropriate format and register."),
        ("Listening and speaking skills",
         "Listen to and understand spoken English, and speak fluently and "
         "accurately in presentations and discussion."),
        ("Critical reading of literature",
         "Comprehend and analyse prose, poetry and drama from the prescribed texts: "
         "themes, characters, literary devices and inference, in short and long answers."),
    ]),
    ("ncert-cbse", "English Core", 12, 12, "NCERT-ENGSKILL-12", "CBSE", [
        ("Reading comprehension",
         "Read unseen passages, including a case-based factual passage with visual "
         "or statistical input; understand, interpret, infer, analyse and summarise."),
        ("Functional writing: notices and invitations",
         "Write notices, formal invitations and replies with the right format and "
         "concise, accurate language."),
        ("Letter writing",
         "Write letters from verbal or visual input: job applications with a "
         "bio-data or resume, and letters to the editor giving suggestions or "
         "opinions on issues of public interest."),
        ("Article and report writing",
         "Write articles and reports on a given topic, organising ideas with a "
         "suitable heading, structure and style."),
        ("Listening and speaking skills",
         "Listen to and understand spoken English, and speak fluently and "
         "accurately in presentations and discussion."),
        ("Critical reading of literature",
         "Comprehend and analyse prose, poetry and drama from the prescribed texts: "
         "themes, characters, literary devices and inference, in short and long answers."),
    ]),
    # ── CBSE Classes I-X: NCERT learning outcomes, one set per class ──────────
    ("ncert-cbse", "English", 1, 1, "NCERT-ENGSKILL-1", "CBSE", [
        ("Listening and speaking",
         "Listen to English words, greetings, polite expressions and simple sentences "
         "and respond in English, the home language or signs; carry out simple "
         "instructions such as 'Shut the door' or 'Bring me the book'."),
        ("Phonics and letter recognition",
         "Recognise the letters A-Z and their sounds; tell small and capital letters "
         "apart; hear the starting sound of familiar words (bat, pen, cat)."),
        ("Vocabulary: words and pictures",
         "Associate words with pictures and name familiar objects seen in pictures."),
        ("Rhymes and poems",
         "Recite poems and rhymes with actions."),
        ("Story comprehension",
         "Answer simple questions about stories and poems orally; identify the "
         "characters and the sequence of a story and ask questions about it."),
        ("Early writing",
         "Draw and scribble in response to poems and stories as the first step to writing."),
    ]),
    ("ncert-cbse", "English", 2, 2, "NCERT-ENGSKILL-2", "CBSE", [
        ("Listening and speaking",
         "Listen and respond to greetings and polite expressions ('How are you?', "
         "'I'm fine, thank you'); give an opinion and ask questions about the "
         "characters and storyline."),
        ("Rhymes and poems",
         "Sing songs and rhymes with action."),
        ("Story comprehension",
         "Answer comprehension questions on stories and poems orally and in writing "
         "(phrases, short sentences); identify characters and the sequence of events."),
        ("Vocabulary: describing words",
         "Use simple adjectives for size, shape, colour, weight and texture "
         "(big, small, round, red, heavy, soft)."),
        ("Grammar: pronouns and prepositions",
         "Use pronouns he/she, his/her, it, this/that, these/those, here/there and "
         "prepositions such as before and between."),
        ("Sentence writing",
         "Compose and write simple short sentences with spaces between words, and "
         "write a few words or a sentence in response to poems and stories."),
    ]),
    ("ncert-cbse", "English", 3, 3, "NCERT-ENGSKILL-3", "CBSE", [
        ("Listening and speaking",
         "Respond to oral and telephone messages; give an opinion about a story and "
         "its characters; perform role-plays and skits with expression."),
        ("Reading aloud and recitation",
         "Recite poems with correct pronunciation and intonation; read aloud with "
         "pauses; read print on classroom walls, posters and charts."),
        ("Reading comprehension",
         "Read short texts with comprehension: identify the main idea, details and "
         "sequence, and draw conclusions."),
        ("Vocabulary: opposites and subject words",
         "Identify and use opposites (day/night, open/close) and vocabulary from "
         "Maths and EVS (add, remove, rain, build)."),
        ("Grammar and punctuation",
         "Use nouns, pronouns, adjectives and prepositions in short sentences; tell "
         "simple past from simple present; use the question mark, full stop and "
         "capital letters correctly."),
        ("Writing and dictation",
         "Write 5-6 sentences on personal experiences from verbal or visual clues; "
         "write words, phrases and sentences from dictation."),
    ]),
    ("ncert-cbse", "English", 4, 4, "NCERT-ENGSKILL-4", "CBSE", [
        ("Listening and speaking",
         "Respond to instructions and announcements; speak briefly on familiar issues "
         "and experiences (saving water, a visit to the zoo); present the highlights "
         "of a text, talk or video; act roles in short skits."),
        ("Reading aloud and recitation",
         "Recite poems with expression and intonation; read aloud observing the "
         "question mark, comma and full stop; read titles, headlines, subtitles, "
         "pamphlets and notices."),
        ("Reading comprehension",
         "Answer questions orally and in writing on a story, poem or article heard "
         "or read, and on everyday experiences."),
        ("Vocabulary and dictionary skills",
         "Infer the meaning of unfamiliar words from context; use a dictionary for "
         "spelling and meaning; crosswords, word chains, riddles and tongue twisters."),
        ("Grammar and punctuation",
         "Use nouns, verbs, adjectives and prepositions; link sentences with "
         "'First', 'Next'; punctuate writing with question marks, commas, full stops "
         "and capitals."),
        ("Writing",
         "Describe events, places and personal experiences; write informal letters "
         "and messages with a sense of audience; write a 7-8 sentence paragraph from "
         "dictation."),
    ]),
    ("ncert-cbse", "English", 5, 5, "NCERT-ENGSKILL-5", "CBSE", [
        ("Listening and speaking",
         "Follow instructions in games; answer questions coherently; conduct short "
         "interviews (grandparents, teachers); share songs, poems, riddles and stories."),
        ("Reading comprehension",
         "Read story books, news headlines and advertisements independently; locate "
         "details and the sequence of events; connect what is inferred with personal "
         "experience."),
        ("Vocabulary: synonyms and antonyms",
         "Use synonyms (big/large, shut/close) and antonyms (inside/outside) from "
         "context clues; use the dictionary for reference."),
        ("Grammar",
         "Identify kinds of nouns and adverbs; tell simple past from simple present; "
         "use grammatically correct sentences to describe, narrate and frame questions."),
        ("Paragraph and letter writing",
         "Write paragraphs from verbal and visual clues with correct punctuation and "
         "linkers; write informal letters, messages and e-mails; take dictation of "
         "lists, paragraphs and dialogues."),
        ("Creative writing",
         "Attempt stories, poems and posters; write and speak on themes such as peace "
         "and equality, giving personal views."),
    ]),
    ("ncert-cbse", "English", 6, 6, "NCERT-ENGSKILL-6", "CBSE", [
        ("Listening and speaking",
         "Take part in role-play, group discussion and debate; respond to oral and "
         "telephone messages and to announcements in class, assembly and public "
         "places; recite poems, jokes and riddles."),
        ("Reading comprehension",
         "Read a variety of texts and identify main ideas, characters and the sequence "
         "of ideas and events; answer questions on familiar and unfamiliar texts and "
         "relate them to personal experience."),
        ("Reading for information",
         "Read notice boards, newspapers and the internet, and interpret tables, "
         "charts, diagrams and maps."),
        ("Vocabulary and dictionary skills",
         "Use synonyms, antonyms and homonyms (tail/tale); deduce word meanings from "
         "context; check meaning and spelling in a dictionary."),
        ("Grammar",
         "Write grammatically correct sentences using nouns, pronouns, verbs, adverbs "
         "and determiners."),
        ("Writing",
         "Draft, revise and write paragraphs with a clear beginning, middle and end "
         "from verbal, print and visual clues; write messages, invitations and formal "
         "and informal letters with a sense of audience."),
        ("Reading literature",
         "Read prose, poetry and plays for understanding and appreciation, and answer "
         "comprehension and inferential questions on them."),
    ]),
    ("ncert-cbse", "English", 7, 7, "NCERT-ENGSKILL-7", "CBSE", [
        ("Listening and speaking",
         "Converse with family, friends and people of different professions using "
         "appropriate vocabulary; respond to instructions and directions (school, "
         "bank, railway station); talk about skits, short films, news and debates."),
        ("Reading aloud and recitation",
         "Read stories aloud and recite poems with appropriate pause, intonation and "
         "pronunciation."),
        ("Reading comprehension",
         "Identify details, characters, main idea and sequence in textual and "
         "non-textual material; think critically and compare; read for pleasure "
         "(adventure, science fiction, biography, travelogue)."),
        ("Study and reference skills",
         "Take notes from lessons, books and online material; seek information in "
         "print and online; use a dictionary, thesaurus and encyclopaedia; infer "
         "word meanings from context."),
        ("Grammar",
         "Use nouns, pronouns, verbs, determiners, time and tense, passive voice, "
         "adjectives and adverbs correctly in communication."),
        ("Writing",
         "Organise sentences coherently with a sense of audience; write formal "
         "letters, diary entries, lists, e-mails and messages; write descriptions "
         "and narratives sensitive to gender, environment and cultural diversity."),
        ("Creative writing",
         "Write dialogues from a story and a story from dialogues; attempt poems and skits."),
    ]),
    ("ncert-cbse", "English", 8, 8, "NCERT-ENGSKILL-8", "CBSE", [
        ("Listening and speaking",
         "Respond to announcements in public places; introduce guests and interview "
         "people about their work; use formulaic polite expressions ('May I borrow "
         "your book?', 'I would like to differ'); give opinions on speeches, news and "
         "debates heard."),
        ("Presentation and performance",
         "Take part in role-play, recitation, skits, debate, elocution and quiz; "
         "narrate real or imaginary stories and life experiences."),
        ("Reading comprehension",
         "Identify details, characters, main idea and sequence; compare, contrast and "
         "think critically, relating ideas to life; read fiction and non-fiction "
         "(articles, travelogues, biographies) for pleasure."),
        ("Vocabulary and reference skills",
         "Infer meanings of unfamiliar words from context; use a dictionary, "
         "thesaurus and encyclopaedia for meaning and spelling."),
        ("Grammar",
         "Use clauses, comparison of adjectives, time and tense, active and passive "
         "voice and reported speech accurately."),
        ("Paragraph writing and editing",
         "Write coherent paragraphs with a beginning, middle and end by drafting, "
         "revising, editing and finalising, with correct punctuation; prepare a "
         "write-up after collecting information."),
        ("Functional writing",
         "Write e-mails, messages, notices, formal letters, diary entries, reports "
         "and short biographical accounts."),
        ("Responding to literature",
         "Answer textual questions with comprehension and inference; write character "
         "sketches and extrapolative pieces; turn a story into a skit."),
    ]),
    ("ncert-cbse", "English", 9, 9, "NCERT-ENGSKILL-9", "CBSE", [
        ("Listening skills",
         "Listen to announcements, instructions, read-aloud texts, audio and video for "
         "gist and detail; listen to and discuss literary and non-literary input; "
         "take notes while listening and summarise."),
        ("Speaking skills",
         "Speak fluently with proper pronunciation, intonation and grammar; take part "
         "in debate, speech, group discussion, presentations and interviews; organise "
         "and present opinions for different audiences."),
        ("Reading comprehension",
         "Read with comprehension using skimming, scanning, predicting, inferring and "
         "summarising; interpret layers of meaning; read environmental print such as "
         "advertisements and labels."),
        ("Literature appreciation",
         "Compare and appreciate characters, themes and plots; explain features of "
         "literary genres; identify metaphor, imagery, symbol, simile, "
         "personification, rhyme scheme and point of view."),
        ("Writing",
         "Write short answers, paragraphs and reports; formal and informal letters, "
         "invitations, advertisements, notices, messages and e-mails; write a "
         "paragraph interpreting a map, graph or table."),
        ("Creative writing",
         "Write short stories and poems; write dialogues and scripts for role-plays "
         "and street plays on social causes."),
        ("Grammar and editing",
         "Use reporting verbs, passive voice, tense and subject-verb agreement in "
         "context; edit passages for punctuation, grammar and spelling; take dictation "
         "accurately."),
        ("Vocabulary",
         "Use words, phrases, idioms and word chunks in context; work out meanings "
         "with a dictionary, thesaurus and digital tools."),
    ]),
    ("ncert-cbse", "English", 10, 10, "NCERT-ENGSKILL-10", "CBSE", [
        ("Listening and speaking",
         "Listen for information, gist and detail; speak with coherence and cohesion "
         "in interactive tasks; use language suited to purpose; talk on contemporary "
         "issues such as social justice, environment and gender."),
        ("Reading comprehension",
         "Read, comprehend and respond to complex texts independently; draw on books, "
         "newspapers and the internet and interpret them analytically; use grammar "
         "cues (tense, reported speech, conjunctions) to understand texts."),
        ("Literature appreciation",
         "Read fiction and non-fiction for pleasure; appreciate shades of literary "
         "meaning; identify metaphor, imagery, symbol, simile, alliteration, allusion "
         "and the writer's point of view; use figurative meanings from texts read."),
        ("Writing",
         "Write paragraphs and narratives by planning, revising and editing; write "
         "reports of school and community events; write personal, official and "
         "business letters, articles and debates from visual or verbal clues."),
        ("Note-making and summarising",
         "Take and make notes while listening or reading (news, discussions, "
         "speeches, texts) and summarise them; present content using graphs and diagrams."),
        ("Grammar",
         "Use grammatical items appropriate to the context in speech and writing, and "
         "take dictation with correct punctuation and spelling."),
        ("Vocabulary and idioms",
         "Use words according to context, formulaic and idiomatic expressions and "
         "collocations; consult dictionaries and books for academic purposes."),
        ("Creative and script writing",
         "Write scripts and take part in role-plays, skits and street plays on social "
         "issues; share ideas through presentations and drama."),
    ]),
    # ── CBSE Hindi Classes I-X ───────────────────────────────────────────────
    ("ncert-cbse", "Hindi", 1, 1, "NCERT-HINSKILL-1", "CBSE", [
        ("Listening and speaking",
         "Listen to and talk about stories, poems and everyday matters in Hindi or the "
         "home language; give an opinion and ask questions about what was heard."),
        ("Sounds and rhymes",
         "Enjoy playing with the sounds and words of Hindi through rhymes, songs and poems."),
        ("Devanagari letters (varnamala)",
         "Recognise Devanagari letters, words and sentences by looking at them and hearing "
         "their sounds in stories and poems."),
        ("Reading print and pictures",
         "Tell print from pictures; observe pictures closely; guess the meaning of print "
         "around them (labels, posters) from context."),
        ("Early writing",
         "Try to write what they heard or think, through drawings, scribbles, letter shapes "
         "and invented spellings."),
    ]),
    ("ncert-cbse", "Hindi", 2, 2, "NCERT-HINSKILL-2", "CBSE", [
        ("Listening and speaking",
         "Talk about stories and poems heard, retell them in their own words, ask questions "
         "and give opinions."),
        ("Devanagari letters and matras",
         "Read letters with their vowel signs (matras) and simple words in Devanagari."),
        ("Reading simple texts",
         "Read short stories, poems and pictures with understanding and talk about them."),
        ("Vocabulary",
         "Use new words met in stories and poems while speaking."),
        ("Writing words and sentences",
         "Write words and short sentences of their own in Devanagari."),
    ]),
    ("ncert-cbse", "Hindi", 3, 3, "NCERT-HINSKILL-3", "CBSE", [
        ("Listening and speaking",
         "Listen to and narrate stories, poems and experiences; take part in conversation "
         "and give reasons for opinions."),
        ("Matras and word reading",
         "Read words with all vowel signs (matras) and conjunct letters fluently."),
        ("Reading comprehension",
         "Read unfamiliar short texts aloud and silently with understanding; find details "
         "and tell what happened in what order."),
        ("Vocabulary and dictionary use",
         "Learn new words from texts and start using a picture dictionary."),
        ("Punctuation",
         "Use the full stop (purna viram) and question mark while reading and writing."),
        ("Writing",
         "Write a few sentences about experiences, pictures and stories in their own words."),
    ]),
    ("ncert-cbse", "Hindi", 4, 4, "NCERT-HINSKILL-4", "CBSE", [
        ("Listening and speaking",
         "Speak about stories, poems and everyday events with expression; ask questions and "
         "respond to what others say."),
        ("Reading comprehension",
         "Read stories, poems and children's magazines with understanding and talk about "
         "the characters and events."),
        ("Grammar: nouns and gender (sangya, ling)",
         "Notice and use naming words and masculine/feminine forms in sentences."),
        ("Vocabulary",
         "Use new words and expressions from texts in their own speech and writing."),
        ("Punctuation",
         "Use the full stop, comma and question mark correctly in writing."),
        ("Writing",
         "Write short paragraphs, messages and simple letters about their experiences."),
    ]),
    ("ncert-cbse", "Hindi", 5, 5, "NCERT-HINSKILL-5", "CBSE", [
        ("Listening and speaking",
         "Narrate experiences and stories in sequence; discuss and give opinions on texts."),
        ("Reading comprehension",
         "Read different kinds of texts (stories, poems, notices, advertisements) with "
         "understanding and draw inferences."),
        ("Grammar: pronouns, adjectives and number",
         "Use pronouns (sarvanam), adjectives (visheshan) and singular/plural (vachan) "
         "correctly in sentences."),
        ("Vocabulary",
         "Use synonyms and opposites and new words from texts in context."),
        ("Writing",
         "Write paragraphs and letters with punctuation, in their own words."),
        ("Creative expression",
         "Write short stories and poems and present their own ideas."),
    ]),
    ("ncert-cbse", "Hindi", 6, 6, "NCERT-HINSKILL-6", "CBSE", [
        ("Listening and speaking",
         "Listen to and discuss texts, news and talks; speak on familiar topics in "
         "standard Hindi with confidence."),
        ("Reading comprehension",
         "Read prose and poetry with understanding: main idea, details, characters, "
         "and inferences; read for pleasure."),
        ("Grammar: verbs and tense (kriya, kaal)",
         "Use verbs in the right tense, and nouns, pronouns and adjectives correctly."),
        ("Vocabulary and dictionary use",
         "Look up meanings in a dictionary and use new words in context."),
        ("Writing",
         "Write paragraphs, letters and descriptions with correct punctuation, "
         "organising their ideas."),
        ("Appreciating poetry",
         "Read poems aloud with rhythm and talk about their feelings and imagery."),
    ]),
    ("ncert-cbse", "Hindi", 7, 7, "NCERT-HINSKILL-7", "CBSE", [
        ("Listening and speaking",
         "Present views on texts and social issues; take part in discussion and debate."),
        ("Reading comprehension",
         "Read varied texts (stories, essays, poems, reports) critically and relate them "
         "to their own experience."),
        ("Grammar and usage",
         "Use nouns, pronouns, adjectives, verbs and tense accurately; correct errors in "
         "sentences."),
        ("Idioms and proverbs (muhavare, lokokti)",
         "Understand and use common idioms and proverbs in speech and writing."),
        ("Writing",
         "Write formal and informal letters, paragraphs and short essays (nibandh)."),
        ("Literature appreciation",
         "Discuss the theme, characters and language of prose and poetry."),
    ]),
    ("ncert-cbse", "Hindi", 8, 8, "NCERT-HINSKILL-8", "CBSE", [
        ("Listening and speaking",
         "Speak on varied topics with reasoning; listen to and analyse talks, news and debates."),
        ("Reading comprehension",
         "Read and analyse literary and non-literary texts, comparing ideas and "
         "giving opinions with reasons."),
        ("Grammar and usage",
         "Apply grammar in context: tense, word forms, sentence types and correct usage."),
        ("Idioms, proverbs and word formation",
         "Use idioms and proverbs; form words with prefixes and suffixes."),
        ("Writing",
         "Write letters, essays, reports and dialogues in a planned way with correct "
         "punctuation."),
        ("Literature appreciation",
         "Appreciate the language, style and message of prose and poetry."),
    ]),
    ("ncert-cbse", "Hindi", 9, 9, "NCERT-HINSKILL-9", "CBSE", [
        ("Unseen passages (apathit gadyansh, kavyansh)",
         "Read unseen prose and poetry passages and answer questions on meaning, "
         "inference and vocabulary."),
        ("Grammar: word formation and sandhi",
         "Words and parts of speech (shabd aur pad), prefixes and suffixes (upsarg, "
         "pratyay), sandhi, anusvar and anunasik, and punctuation."),
        ("Grammar: sentence types by meaning",
         "Identify and form sentences by meaning (arth ke aadhar par vakya bhed)."),
        ("Writing: letters and paragraphs",
         "Write formal and informal letters and paragraphs (anuchhed) on given topics."),
        ("Writing: notices, messages and dialogue",
         "Write notices, messages, dialogues and short stories in the right format."),
        ("Literature",
         "Understand and analyse the prescribed prose and poetry: theme, characters and style."),
    ]),
    ("ncert-cbse", "Hindi", 10, 10, "NCERT-HINSKILL-10", "CBSE", [
        ("Unseen passages (apathit gadyansh, kavyansh)",
         "Read unseen prose and poetry passages and answer questions on meaning, "
         "inference and vocabulary."),
        ("Grammar: sentence types and voice",
         "Sentence types by structure (saral, sanyukt, mishra) and voice (vachya)."),
        ("Grammar: parsing, figures of speech and idioms",
         "Parse words in a sentence (pad parichay), identify figures of speech (alankar) "
         "and use idioms (muhavare)."),
        ("Writing: letters, paragraphs and e-mails",
         "Write formal letters, paragraphs and e-mails on given topics."),
        ("Writing: advertisements, notices and messages",
         "Write advertisements, notices, messages and short stories in the right format."),
        ("Literature",
         "Understand and analyse the prescribed prose and poetry, including poets such as "
         "Surdas and Tulsidas: theme, context and style."),
    ]),
    # ── CBSE Sanskrit Classes VI-X ───────────────────────────────────────────
    ("ncert-cbse", "Sanskrit", 6, 6, "NCERT-SANSKILL-6", "CBSE", [
        ("Script and pronunciation (varnamala)",
         "Read and write the Sanskrit alphabet: vowels (svara), consonants (vyanjana) and "
         "conjunct consonants, with correct pronunciation."),
        ("Basic sentences and pronouns",
         "Make simple sentences with pronouns (esha, eshah, etat; aham, tvam) and ask "
         "and answer 'who/what is this'."),
        ("Word forms (shabda-rupa)",
         "Use forms of common nouns (akaranta, akaranta-stri) in the main cases."),
        ("Verb forms (dhatu-rupa)",
         "Use present-tense verb forms (lat lakara) in all three persons and numbers."),
        ("Numbers and time",
         "Count in Sanskrit and tell the time in simple sentences."),
        ("Reading and recitation",
         "Read short passages, stories and shlokas aloud and answer simple questions."),
    ]),
    ("ncert-cbse", "Sanskrit", 7, 7, "NCERT-SANSKILL-7", "CBSE", [
        ("Reading comprehension",
         "Read prose, conversations and shlokas and answer in one word or full sentences."),
        ("Word forms (shabda-rupa)",
         "Use noun and pronoun forms across the cases (vibhakti) and genders."),
        ("Verb forms and tenses (dhatu-rupa)",
         "Use verbs in the present, past (lan) and future (lrt) tenses and the imperative."),
        ("Indeclinables and numbers (avyaya, sankhya)",
         "Use common indeclinables (adya, shvah, atra, kutra) and numbers in sentences."),
        ("Subhashitas and recitation",
         "Recite and explain subhashitas (wise sayings) with correct pronunciation."),
        ("Writing and translation",
         "Write simple sentences in Sanskrit and translate short sentences from Hindi or English."),
    ]),
    ("ncert-cbse", "Sanskrit", 8, 8, "NCERT-SANSKILL-8", "CBSE", [
        ("Reading comprehension",
         "Read prose, poetry and dialogues and answer questions in Sanskrit."),
        ("Sandhi",
         "Join and split words using vowel sandhi (svara-sandhi)."),
        ("Suffixes (pratyaya)",
         "Form words with ktva, lyap and tumun and use them in sentences."),
        ("Word and verb forms",
         "Use noun, pronoun and verb forms correctly across cases and tenses."),
        ("Writing and translation",
         "Describe a picture, write a short paragraph and translate sentences into Sanskrit."),
        ("Subhashitas and literature",
         "Understand and explain subhashitas and prescribed lessons."),
    ]),
    ("ncert-cbse", "Sanskrit", 9, 9, "NCERT-SANSKILL-9", "CBSE", [
        ("Unseen passage (apathita-avabodhanam)",
         "Read an unseen Sanskrit passage and answer questions, give a title and "
         "identify grammar in it."),
        ("Letter writing and picture description",
         "Complete an informal letter and describe a picture in Sanskrit."),
        ("Translation and composition",
         "Translate sentences from Hindi or English into Sanskrit and complete a "
         "paragraph or dialogue."),
        ("Applied grammar: sandhi and pratyaya",
         "Join and split words (vowel and consonant sandhi) and use suffixes "
         "(ktva, lyap, tumun, kta, ktavatu)."),
        ("Applied grammar: forms, numbers and time",
         "Noun, pronoun and verb forms, numbers, telling time and correcting errors in sentences."),
        ("Prescribed text (pathita-avabodhanam)",
         "Understand prescribed prose, poetry and drama: meaning, characters and "
         "explanation of verses."),
    ]),
    ("ncert-cbse", "Sanskrit", 10, 10, "NCERT-SANSKILL-10", "CBSE", [
        ("Unseen passage (apathita-avabodhanam)",
         "Read an unseen Sanskrit passage and answer questions, give a title and "
         "identify grammar in it."),
        ("Letter writing and picture description",
         "Write a formal or informal letter and describe a picture in Sanskrit."),
        ("Translation and composition",
         "Translate sentences into Sanskrit and write a short paragraph or dialogue."),
        ("Applied grammar: sandhi and samasa",
         "Join and split words with sandhi and form and analyse compounds (samasa)."),
        ("Applied grammar: pratyaya, voice and time",
         "Use suffixes (pratyaya), active and passive voice (vachya), time, indeclinables "
         "and correct errors in sentences."),
        ("Prescribed text (pathita-avabodhanam)",
         "Understand and explain the prescribed prose, poetry and drama (Shemushi)."),
    ]),
]

# Where each set's skills come from, by source_id prefix (stored on the node).
SOURCE_DOCUMENTS = {
    "ISC-ENGSKILL-11-12": "ISC 2027 English (801) regulations",
    "NCERT-ENGSKILL-11": "CBSE English Core (301) curriculum",
    "NCERT-ENGSKILL-12": "CBSE English Core (301) curriculum",
    **{f"NCERT-ENGSKILL-{g}": "NCERT Learning Outcomes at the Elementary Stage (2017), English"
       for g in range(1, 9)},
    **{f"NCERT-ENGSKILL-{g}": "NCERT secondary learning outcomes, English (CBSE Learning Standards Framework)"
       for g in (9, 10)},
    **{f"NCERT-HINSKILL-{g}": "NCERT Learning Outcomes at the Elementary Stage (2017), Hindi"
       for g in range(1, 9)},
    **{f"NCERT-HINSKILL-{g}": "CBSE Hindi Course A (002) curriculum" for g in (9, 10)},
    **{f"NCERT-SANSKILL-{g}": "NCERT Sanskrit learning outcomes and Deepakam/Ruchira textbooks"
       for g in (6, 7, 8)},
    **{f"NCERT-SANSKILL-{g}": "CBSE Sanskrit (122) curriculum" for g in (9, 10)},
}

# Sets defined but not inserted yet. CBSE Class 4 has no other nodes in the
# database (T11): inserting only its language skills would make them the sole
# Class 4 subjects in the form and the report. Insert them together with T11.
PENDING_PREFIXES = {"NCERT-ENGSKILL-4", "NCERT-HINSKILL-4"}


def build_nodes(include_pending: bool = False) -> list[dict]:
    nodes = []
    for system, subject, gmin, gmax, prefix, board, skills in SKILL_SETS:
        if prefix in PENDING_PREFIXES and not include_pending:
            continue
        grade_label = f"Class {gmin}" if gmin == gmax else f"Classes {gmin}-{gmax}"
        for i, (name, description) in enumerate(skills, 1):
            nodes.append({
                "node_type": "topic",
                "name": name,
                "description": description,
                "grade_level_min": gmin,
                "grade_level_max": gmax,
                "curriculum_system": system,
                "metadata": {
                    "source_id": f"{prefix}-S{i}",
                    "source_type": "skill",
                    "component": COMPONENT,
                    "subject": subject,
                    "streams": subject_streams(subject, gmin),
                    "board": board,
                    "source_document": SOURCE_DOCUMENTS[prefix],
                    # Teaching order within the class (basics first): the report
                    # lists a language the student has never studied in this order.
                    "skill_order": i,
                    # Phrased as a skill, like the US standards it is matched
                    # against; generate_embeddings uses it for skill nodes.
                    # ("English Core" -> "English".)
                    "embedding_text": f"{board} {subject.split()[0]} language skill, {grade_label} - {name} - {description}",
                },
            })
    return nodes


def main() -> int:
    parser = argparse.ArgumentParser(description="Insert language skill nodes and embed them")
    parser.add_argument("--dry-run", action="store_true")
    parser.add_argument("--include-pending", action="store_true",
                        help="also insert sets in PENDING_PREFIXES (CBSE Class 4, once T11 is loaded)")
    args = parser.parse_args()

    nodes = build_nodes(args.include_pending)
    if args.dry_run:
        for n in nodes:
            m = n["metadata"]
            print(f"{n['curriculum_system']:<11} {m['subject']:<13} {n['grade_level_min']}-{n['grade_level_max']} "
                  f"{m['source_id']:<22} {n['name']}")
        print(f"{len(nodes)} nodes")
        return 0

    from config import INSERT_BATCH_SIZE  # noqa: E402
    from db.supabase_client import batch_insert, get_client, get_existing_source_ids, refresh_subject_index  # noqa: E402
    from generate_embeddings import generate_embeddings  # noqa: E402

    client = get_client()
    systems = sorted({n["curriculum_system"] for n in nodes})
    existing: set[str] = set()
    for system in systems:
        existing |= get_existing_source_ids(client, system)
    new = [n for n in nodes if n["metadata"]["source_id"] not in existing]
    print(f"{len(nodes)} skill nodes, {len(new)} new")
    if new:
        batch_insert(client, "curriculum_nodes", new, INSERT_BATCH_SIZE)
        refresh_subject_index(client)
    # Embeds only nodes that have no embedding yet.
    generate_embeddings(systems)
    return 0


if __name__ == "__main__":
    sys.exit(main())
