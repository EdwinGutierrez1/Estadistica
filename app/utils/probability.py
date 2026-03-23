from typing import List, Dict, Tuple
from collections import Counter

SUITS = ['hearts', 'diamonds', 'clubs', 'spades']
VALUES = ['2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K', 'A']

CARD_POINTS = {
    '2': 2, '3': 3, '4': 4, '5': 5, '6': 6,
    '7': 7, '8': 8, '9': 9, '10': 10,
    'J': 10, 'Q': 10, 'K': 10, 'A': 11
}


def create_deck(num_decks: int = 1) -> List[Dict]:
    deck = []
    for deck_num in range(num_decks):
        for suit in SUITS:
            for value in VALUES:
                deck.append({
                    'suit':    suit,
                    'value':   value,
                    'numeric': CARD_POINTS[value],
                    'id':      f"{suit}_{value}_{deck_num}"
                })
    return deck


def calculate_hand_score(cards: List[Dict]) -> int:
    total = 0
    aces_as_eleven = 0

    for card in cards:
        total += card['numeric']
        if card['value'] == 'A':
            aces_as_eleven += 1

    while total > 21 and aces_as_eleven > 0:
        total -= 10
        aces_as_eleven -= 1

    return total


def is_blackjack(cards: List[Dict]) -> bool:
    return len(cards) == 2 and calculate_hand_score(cards) == 21


class ProbabilityEngine:
    def __init__(self, remaining_deck: List[Dict]):
        self.deck = remaining_deck
        self.N = len(remaining_deck)
        self._value_counts = Counter(c['value'] for c in remaining_deck)
        self._numeric_counts = Counter(c['numeric'] for c in remaining_deck)

    @property
    def total_cards(self) -> int:
        return self.N

    def prob_next_card_value(self, value: str) -> float:
        if self.N == 0:
            return 0.0
        return self._value_counts.get(value, 0) / self.N

    def prob_next_card_points(self, points: int) -> float:
        if self.N == 0:
            return 0.0
        return self._numeric_counts.get(points, 0) / self.N

    def prob_bust(self, current_score: int) -> float:
        if self.N == 0:
            return 0.0
        threshold = 21 - current_score
        if threshold >= 11:
            return 0.0
        bust_cards = sum(
            count for points, count in self._numeric_counts.items()
            if points > threshold
        )
        return bust_cards / self.N

    def prob_safe_hit(self, current_score: int) -> float:
        return 1.0 - self.prob_bust(current_score)

    def expected_next_value(self) -> float:
        if self.N == 0:
            return 0.0
        total = sum(points * count for points, count in self._numeric_counts.items())
        return total / self.N

    def calculate_win_probability(self, player_score: int, dealer_visible_card: Dict, depth: int = 3) -> Dict:
        if self.N == 0:
            return {'win': 0.0, 'lose': 1.0, 'push': 0.0, 'bust': 0.0}

        if player_score > 21:
            return {'win': 0.0, 'lose': 0.0, 'push': 0.0, 'bust': 1.0}

        dealer_score_dist = self._dealer_final_distribution(
            current_score=dealer_visible_card['numeric'],
            deck=list(self.deck),
            depth=depth
        )

        prob_win = 0.0
        prob_lose = 0.0
        prob_push = 0.0

        total_weight = sum(dealer_score_dist.values())
        if total_weight == 0:
            return {'win': 0.33, 'lose': 0.33, 'push': 0.34, 'bust': 0.0}

        for dealer_final, weight in dealer_score_dist.items():
            prob = weight / total_weight
            if dealer_final > 21:
                prob_win += prob
            elif player_score > dealer_final:
                prob_win += prob
            elif player_score < dealer_final:
                prob_lose += prob
            else:
                prob_push += prob

        p_bust = self.prob_bust(player_score)

        return {
            'win':  round(prob_win, 4),
            'lose': round(prob_lose, 4),
            'push': round(prob_push, 4),
            'bust': round(p_bust, 4),
        }

    def _dealer_final_distribution(self, current_score: int, deck: List[Dict], depth: int) -> Counter:
        result = Counter()

        if depth == 0 or not deck:
            result[current_score] = 1
            return result

        if current_score >= 17:
            result[current_score] = 1
            return result

        value_groups = {}
        for card in deck:
            key = card['numeric']
            if key not in value_groups:
                value_groups[key] = []
            value_groups[key].append(card)

        for points, cards_of_type in value_groups.items():
            new_score = current_score + points

            if new_score > 21:
                result[new_score] += len(cards_of_type)
                continue

            new_deck = [c for c in deck if c['numeric'] != points]
            new_deck = new_deck + cards_of_type[1:]

            sub_dist = self._dealer_final_distribution(new_score, new_deck, depth - 1)

            weight = len(cards_of_type)
            for score, sub_weight in sub_dist.items():
                result[score] += sub_weight * weight

        return result

    def get_card_distribution_summary(self) -> Dict:
        summary = {}
        for value in VALUES:
            count = self._value_counts.get(value, 0)
            summary[value] = {
                'count':       count,
                'probability': round(count / self.N, 4) if self.N > 0 else 0.0
            }
        return summary


def compute_probabilities_for_player(player_cards, dealer_visible_card, remaining_deck):
    engine = ProbabilityEngine(remaining_deck)
    score = calculate_hand_score(player_cards)
    win_probs = engine.calculate_win_probability(score, dealer_visible_card)

    return {
        'current_score':     score,
        'is_blackjack':      is_blackjack(player_cards),
        'prob_win':          win_probs['win'],
        'prob_lose':         win_probs['lose'],
        'prob_push':         win_probs['push'],
        'prob_bust':         win_probs['bust'],
        'prob_safe_hit':     engine.prob_safe_hit(score),
        'expected_value':    engine.expected_next_value(),
        'cards_remaining':   engine.total_cards,
        'deck_distribution': engine.get_card_distribution_summary(),
        'prob_ten_next':     engine.prob_next_card_points(10),
        'prob_ace_next':     engine.prob_next_card_value('A'),
    }