SET = {
    "title": "Build a Tokenizer",
    "learn": {"title": "Foundation model internals", "route": "/docs/llms-genai/foundation-model-internals", "description": "How text becomes token ids, and why the tokenizer shapes cost, context length and failure modes."},
}


def starter(sig):
    return f"def {sig}:\n    # Your code here\n    pass\n"


MERGE = '''
def merge(tokens, pair, new_token):
    """Replace every non-overlapping occurrence of pair, left to right."""
    out, i = [], 0
    while i < len(tokens):
        if i + 1 < len(tokens) and (tokens[i], tokens[i + 1]) == pair:
            out.append(new_token)
            i += 2
        else:
            out.append(tokens[i])
            i += 1
    return out
'''

COUNT = '''
def pair_counts(words):
    """words maps a space-separated token string to its frequency."""
    counts = {}
    for word, freq in words.items():
        toks = word.split(" ")
        for a, b in zip(toks, toks[1:]):
            counts[(a, b)] = counts.get((a, b), 0) + freq
    return counts
'''

PROBLEMS = [
    {
        "id": "tok-char-vocab",
        "title": "Character Vocabulary With an Unknown Token",
        "difficulty": "easy",
        "fn": "char_encode",
        "signature": "char_encode(corpus: str, text: str) -> dict",
        "starter": starter("char_encode(corpus, text)"),
        "mission": "Build the simplest tokenizer: one id per character seen in a training corpus, with a reserved id for anything it has never seen.",
        "task": "Implement `char_encode(corpus, text)`. The vocabulary is `\"<unk>\"` at id 0, followed by every distinct character of `corpus` in sorted order. Encode `text` to ids, using 0 for characters not in the vocabulary. Return `{\"vocab\": [...], \"ids\": [...]}`.",
        "constraints": ["Id 0 is always `<unk>`.", "Characters are sorted by Python's default string order.", "Each character appears once in the vocabulary."],
        "hints": {"small": "sorted(set(corpus)) gives the characters in a stable order.", "strong": "Build a dict from character to index once, then use .get(ch, 0) per character.", "concept": "A tokenizer is a fixed mapping chosen at training time. Text it never saw still has to map somewhere."},
        "tests": [
            {"label": "Every character known", "input": {"corpus": "abca", "text": "cab"}, "expect": {"vocab": ["<unk>", "a", "b", "c"], "ids": [3, 1, 2]}},
            {"label": "Unseen characters map to 0", "input": {"corpus": "hello", "text": "help!"}, "expect": {"vocab": ["<unk>", "e", "h", "l", "o"], "ids": [2, 1, 3, 0, 0]}},
            {"label": "Empty text", "input": {"corpus": "xy", "text": ""}, "expect": {"vocab": ["<unk>", "x", "y"], "ids": []}},
            {"label": "Spaces and capitals are characters too", "input": {"corpus": "The cat sat", "text": "That cat"}, "hidden": True},
        ],
        "solution": '''
def char_encode(corpus, text):
    vocab = ["<unk>"] + sorted(set(corpus))
    index = {ch: i for i, ch in enumerate(vocab)}
    return {"vocab": vocab, "ids": [index.get(ch, 0) for ch in text]}
''',
        "intuition": """
## Text has to become integers

A model's embedding table is indexed by integers, so every tokenizer is a mapping from text to ids that is fixed at training time. The simplest one gives each character its own id. On `"hello"` that is 4 characters plus a reserved **unknown token** for everything else.

## The unknown token loses information

Encode `"help!"` and the `p` and the `!` both become id 0. The model cannot tell them apart, and decoding gives back `<unk>` twice. Character vocabularies are small (English text needs about 100 ids), but sequences are long: one id per character means a 1,000-word document is roughly 6,000 tokens (estimate: about 6 characters per English word, counting the space). The next problems build **byte-pair encoding**, which merges frequent character pairs to make sequences shorter and falls back to bytes so nothing is unknown.

> **Remember:** a vocabulary is a frozen list. Decide what happens to text outside it before you train.
""",
    },
    {
        "id": "tok-bpe-pair-counts",
        "title": "BPE: Count Adjacent Pairs",
        "difficulty": "easy",
        "fn": "most_frequent_pair",
        "signature": "most_frequent_pair(words: dict[str, int]) -> list",
        "starter": starter("most_frequent_pair(words)"),
        "mission": "Find the pair of adjacent tokens that occurs most often in a word-frequency table, the choice byte-pair encoding makes at every training step.",
        "task": "Implement `most_frequent_pair(words)`. Each key is a word already split into tokens by single spaces (`\"l o w\"`), each value is how often that word occurs. Count every adjacent token pair, weighted by word frequency. Return `[first, second, count]` for the most frequent pair, breaking ties by the smallest `(first, second)` in string order. Return `None` if no word has two tokens.",
        "constraints": ["Weight each pair by the word's frequency.", "Pairs never cross word boundaries.", "Ties go to the lexicographically smallest pair."],
        "hints": {"small": "zip(toks, toks[1:]) walks adjacent pairs of one word.", "strong": "Pick with min(counts, key=lambda p: (-counts[p], p)).", "concept": "Counting within words is why BPE never merges the end of one word with the start of the next."},
        "tests": [
            {"label": "Classic example", "input": {"words": {"l o w": 5, "l o w e r": 2, "n e w e s t": 6, "w i d e s t": 3}}, "expect": ["e", "s", 9]},
            {"label": "Tie broken by string order", "input": {"words": {"a b": 1, "c d": 1}}, "expect": ["a", "b", 1]},
            {"label": "No pairs", "input": {"words": {"a": 3, "b": 1}}, "expect": None},
            {"label": "Repeated pair inside one word", "input": {"words": {"a a a": 2, "a b": 3}}, "hidden": True},
        ],
        "solution": COUNT + '''
def most_frequent_pair(words):
    counts = pair_counts(words)
    if not counts:
        return None
    best = min(counts, key=lambda p: (-counts[p], p))
    return [best[0], best[1], counts[best]]
''',
        "intuition": """
## The statistic BPE runs on

**Byte-pair encoding** (Sennrich et al., 2016) builds a vocabulary bottom-up. Start with single characters, find the adjacent pair that occurs most often, give it its own token, and repeat. This problem is the counting step.

Training text is first split into words and counted, so the corpus `low low low low low lower lower newest...` becomes a small table: `"l o w": 5`, `"l o w e r": 2` and so on. Each pair inside a word is counted once per occurrence of the word. In the classic example, `e s` appears in `newest` (6 times) and `widest` (3 times), 9 in total, more than any other pair.

## Ties need a rule

Two pairs with the same count are common in small corpora. Picking either is valid BPE, but the resulting vocabularies differ, and a tokenizer that changes between two training runs on the same data breaks reproducibility. A fixed tie-break (here: smallest pair in string order) makes training deterministic.

> **Remember:** count pairs inside words, weight by word frequency, and break ties the same way every time.
""",
    },
    {
        "id": "tok-bpe-merge",
        "title": "BPE: Apply One Merge",
        "difficulty": "easy",
        "fn": "merge",
        "signature": "merge(tokens: list[str], pair: list[str], new_token: str) -> list[str]",
        "starter": starter("merge(tokens, pair, new_token)"),
        "mission": "Replace every occurrence of a pair of adjacent tokens with one merged token, scanning left to right so overlapping matches are handled the same way every time.",
        "task": "Implement `merge(tokens, pair, new_token)`. Walk `tokens` left to right; whenever `tokens[i]` and `tokens[i + 1]` equal `pair`, emit `new_token` and skip both; otherwise emit `tokens[i]`. Return the new list.",
        "constraints": ["Matches do not overlap: in `a a a` the pair `a a` merges once, at the start.", "Do not modify the input list.", "A pair that never appears returns an equal copy."],
        "hints": {"small": "Use an index you advance by 2 after a merge and by 1 otherwise.", "strong": "while i < len(tokens): check i + 1 < len(tokens) before reading tokens[i + 1].", "concept": "Left-to-right, non-overlapping is the convention BPE implementations use, so training and encoding agree."},
        "tests": [
            {"label": "Two matches", "input": {"tokens": ["l", "o", "w", "l", "o"], "pair": ["l", "o"], "new_token": "lo"}, "expect": ["lo", "w", "lo"]},
            {"label": "Overlap merges from the left", "input": {"tokens": ["a", "a", "a"], "pair": ["a", "a"], "new_token": "aa"}, "expect": ["aa", "a"]},
            {"label": "No match", "input": {"tokens": ["x", "y"], "pair": ["y", "x"], "new_token": "yx"}, "expect": ["x", "y"]},
            {"label": "Four in a row", "input": {"tokens": ["b", "b", "b", "b", "c"], "pair": ["b", "b"], "new_token": "bb"}, "hidden": True},
        ],
        "solution": MERGE.replace("    out, i = [], 0", "    pair = tuple(pair)\n    out, i = [], 0"),
        "intuition": """
## One rule, applied everywhere

After choosing a pair, BPE rewrites the corpus so that pair is a single token. On `l o w l o` with the merge `l o -> lo`, the result is `lo w lo`: three tokens instead of five. Every merge shortens sequences, which is the point: fewer tokens per sentence means more text fits in a context window and each forward pass covers more content.

## Overlaps need a convention

In `a a a`, the pair `a a` occurs at positions 0 and 1, and the two occurrences share the middle `a`. Only one can merge. Scanning left to right and skipping both tokens after a merge gives `aa a`. Any consistent rule works, but training and encoding must use the same one, or text is tokenized differently at inference than during training.

> **Remember:** merge left to right, skip both tokens after a match, never read past the end.
""",
    },
    {
        "id": "tok-bpe-train",
        "title": "BPE: Train a Merge List",
        "difficulty": "hard",
        "fn": "train_bpe",
        "signature": "train_bpe(text: str, num_merges: int) -> list[list[str]]",
        "starter": starter("train_bpe(text, num_merges)"),
        "mission": "Learn a byte-pair-encoding merge list from raw text: split into words, start from characters, and repeatedly merge the most frequent pair.",
        "task": "Implement `train_bpe(text, num_merges)`. Split `text` on whitespace into words and count them. Represent each word as its characters followed by an end-of-word marker `\"</w>\"`. Then repeat `num_merges` times: find the most frequent adjacent pair (ties to the smallest pair in string order), stop early if there is none, record it, and merge it in every word, with the new token being the two strings concatenated. Return the merges in order as `[first, second]` lists.",
        "constraints": ["Append `</w>` to every word so suffixes stay distinct from prefixes.", "Stop early when no pair is left.", "Use the same left-to-right merge as the previous problem."],
        "hints": {"small": "Keep a dict mapping each word's token tuple to its count, and rebuild it after every merge.", "strong": "Counts change after each merge, so recount pairs every iteration (fine at this size).", "concept": "The merge list is the tokenizer. Encoding replays the merges in the same order."},
        "tests": [
            {"label": "Three merges", "input": {"text": "low low low lower newest newest", "num_merges": 3}},
            {"label": "Single word", "input": {"text": "aaa", "num_merges": 2}, "expect": [["a", "a"], ["a", "</w>"]]},
            {"label": "Stops when nothing is left", "input": {"text": "ab", "num_merges": 10}, "expect": [["a", "b"], ["ab", "</w>"]]},
            {"label": "Longer corpus", "input": {"text": "the cat sat on the mat the cat ate", "num_merges": 6}, "hidden": True},
        ],
        "solution": MERGE + '''
def train_bpe(text, num_merges):
    freqs = {}
    for word in text.split():
        key = tuple(word) + ("</w>",)
        freqs[key] = freqs.get(key, 0) + 1
    merges = []
    for _ in range(num_merges):
        counts = {}
        for toks, f in freqs.items():
            for a, b in zip(toks, toks[1:]):
                counts[(a, b)] = counts.get((a, b), 0) + f
        if not counts:
            break
        pair = min(counts, key=lambda p: (-counts[p], p))
        merges.append(list(pair))
        new = {}
        for toks, f in freqs.items():
            key = tuple(merge(list(toks), pair, pair[0] + pair[1]))
            new[key] = new.get(key, 0) + f
        freqs = new
    return merges
''',
        "intuition": """
## The training loop is the last two problems, repeated

Training BPE is counting and merging in a loop. Start from characters, count pairs, merge the winner, recount, and stop after a fixed number of merges. GPT-2 ran this for 50,000 merges (Radford et al., 2019); the vocabulary size is simply the number of merges plus the starting symbols.

## The end-of-word marker

Without a marker, the `er` at the end of `lower` and the `er` inside `eraser` would be the same token. Appending `</w>` to every word lets BPE learn `er</w>` as a suffix separately from `er` inside a word, and it tells the decoder where to put spaces back.

## Why stop early

`"ab"` has only two possible merges: `a b`, then `ab </w>`. After that every word is a single token and no pairs remain. Asking for 10 merges must not loop forever or invent pairs.

> **Remember:** the output of training is an ordered merge list. Order matters, because encoding applies merges in the order they were learned.
""",
    },
    {
        "id": "tok-bpe-encode",
        "title": "BPE: Encode a Word With Ranked Merges",
        "difficulty": "medium",
        "fn": "bpe_encode",
        "signature": "bpe_encode(word: str, merges: list[list[str]]) -> list[str]",
        "starter": starter("bpe_encode(word, merges)"),
        "mission": "Tokenize a new word with a trained merge list, applying the highest-priority merge available at each step, the way GPT-2's tokenizer does.",
        "task": "Implement `bpe_encode(word, merges)`. Start from the word's characters plus `\"</w>\"`. A merge's rank is its index in `merges` (0 is highest priority). Repeatedly find, among the adjacent pairs currently present, the one with the lowest rank; merge all its occurrences left to right; stop when no present pair has a rank. Return the final tokens.",
        "constraints": ["Always apply the best-ranked pair present, not the first pair in the word.", "Merge every occurrence of that pair before choosing the next.", "Pairs not in `merges` are never merged."],
        "hints": {"small": "Build rank = {tuple(m): i for i, m in enumerate(merges)} once.", "strong": "Each loop: candidates = pairs present that are in rank; if none, stop; else merge min(candidates, key=rank.get).", "concept": "Encoding replays training: the same merges, in the same priority order."},
        "tests": [
            {"label": "Rank decides, not position", "input": {"word": "low", "merges": [["o", "w"], ["l", "o"], ["l", "ow"]]}, "expect": ["low", "</w>"]},
            {"label": "Suffix merge", "input": {"word": "lower", "merges": [["e", "r"], ["er", "</w>"], ["l", "o"]]}, "expect": ["lo", "w", "er</w>"]},
            {"label": "No known merges", "input": {"word": "xyz", "merges": [["a", "b"]]}, "expect": ["x", "y", "z", "</w>"]},
            {"label": "Repeated letters", "input": {"word": "aaaa", "merges": [["a", "a"], ["aa", "aa"], ["aaaa", "</w>"]]}, "hidden": True},
        ],
        "solution": MERGE + '''
def bpe_encode(word, merges):
    rank = {tuple(m): i for i, m in enumerate(merges)}
    tokens = list(word) + ["</w>"]
    while True:
        present = {(a, b) for a, b in zip(tokens, tokens[1:]) if (a, b) in rank}
        if not present:
            return tokens
        best = min(present, key=rank.get)   # lowest rank = learned first
        tokens = merge(tokens, best, best[0] + best[1])
''',
        "intuition": """
## Replaying training on new text

A trained BPE tokenizer is its merge list. To encode a word it has never seen, start from characters and keep applying merges, but in the order they were learned, not in the order they appear in the word.

With merges `o w` (rank 0), `l o` (rank 1) and `l ow` (rank 2), the word `low` has both `l o` and `o w` available. Applying `l o` first would give `lo w`, and no merge combines `lo` with `w`. Applying the lower-ranked `o w` first gives `l ow`, then `low`: one token, as training intended.

## A common bug

Scanning the word once and merging pairs as they appear produces different tokens from training. The model then sees token sequences at inference that it rarely saw during training. Quality drops and nothing raises an error.

> **Remember:** at each step, apply the best-ranked pair present. Stop when no present pair is in the merge list.
""",
    },
    {
        "id": "tok-byte-fallback",
        "title": "Byte Fallback for Unknown Characters",
        "difficulty": "medium",
        "fn": "byte_fallback_tokens",
        "signature": "byte_fallback_tokens(text: str, vocab: list[str]) -> list[str]",
        "starter": starter("byte_fallback_tokens(text, vocab)"),
        "mission": "Never emit an unknown token: characters outside the vocabulary are encoded as their UTF-8 bytes, so any text round-trips exactly.",
        "task": "Implement `byte_fallback_tokens(text, vocab)`. For each character of `text`: if it is in `vocab`, emit it; otherwise emit one token per byte of its UTF-8 encoding, written as `<0xHH>` with two upper-case hex digits. Return the token list.",
        "constraints": ["Use UTF-8: `\"é\"` is 2 bytes, most emoji are 4.", "Hex digits are upper case and zero-padded: `<0x0A>`.", "Known characters are never split into bytes."],
        "hints": {"small": "ch.encode(\"utf-8\") returns the bytes of one character.", "strong": "f\"<0x{b:02X}>\" formats one byte.", "concept": "With 256 byte tokens in the vocabulary, every possible string has an encoding."},
        "tests": [
            {"label": "All known", "input": {"text": "cat", "vocab": ["a", "c", "t"]}, "expect": ["c", "a", "t"]},
            {"label": "Accented letter falls back to two bytes", "input": {"text": "café", "vocab": ["a", "c", "f"]}, "expect": ["c", "a", "f", "<0xC3>", "<0xA9>"]},
            {"label": "Newline is one byte", "input": {"text": "a\nb", "vocab": ["a", "b"]}, "expect": ["a", "<0x0A>", "b"]},
            {"label": "Emoji is four bytes", "input": {"text": "ok👍", "vocab": ["o", "k"]}, "hidden": True},
            {"label": "Hindi text", "input": {"text": "नमस्ते", "vocab": ["न"]}, "hidden": True},
        ],
        "solution": '''
def byte_fallback_tokens(text, vocab):
    known = set(vocab)
    tokens = []
    for ch in text:
        if ch in known:
            tokens.append(ch)
        else:
            tokens.extend(f"<0x{b:02X}>" for b in ch.encode("utf-8"))
    return tokens
''',
        "intuition": """
## No text is unknown at the byte level

Every string is a sequence of bytes, and there are only 256 possible bytes. A tokenizer that keeps 256 byte tokens in its vocabulary can encode anything: an emoji, a Hindi word, a binary blob pasted into a prompt. SentencePiece calls this **byte fallback**, and Llama's tokenizer uses it (Touvron et al., 2023).

`é` is not in our small vocabulary, so it becomes its UTF-8 bytes `C3 A9`, written `<0xC3>` and `<0xA9>`. Decoding joins the bytes back and recovers `é` exactly.

## The cost lands on some languages

The fallback is lossless, but not cheap. Each Devanagari character is 3 bytes, so `नमस्ते` (6 characters) costs 18 tokens when none of it is in the vocabulary. With a vocabulary trained mostly on English, the same sentence can cost several times more tokens in Hindi than in English, which means higher API prices and shorter effective context for those users.

> **Remember:** byte fallback trades sequence length for never losing information. Vocabulary coverage decides who pays that cost.
""",
    },
]
