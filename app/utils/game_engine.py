import random
from typing import List, Dict, Optional
from app.utils.probability import (
    create_deck, calculate_hand_score, is_blackjack,
    compute_probabilities_for_player
)


class GameState:
    def __init__(self, game_id, room_id, player_ids, num_decks=1):
        self.game_id              = game_id
        self.room_id              = room_id
        self.player_ids           = player_ids
        self.deck                 = create_deck(num_decks)
        self._shuffle()
        self.player_hands         = {pid: [] for pid in player_ids}
        self.player_done          = {pid: False for pid in player_ids}
        self.dealer_hand          = []
        self.dealer_card_hidden   = True
        self.current_player_index = 0
        self.phase                = 'dealing'
        self.results              = {}
        self.action_log           = []

    def _shuffle(self):
        random.shuffle(self.deck)

    def deal_initial_cards(self):
        for pid in self.player_ids:
            self.player_hands[pid].append(self._draw_card())
        self.dealer_hand.append(self._draw_card())
        for pid in self.player_ids:
            self.player_hands[pid].append(self._draw_card())
        self.dealer_hand.append(self._draw_card())
        self.phase = 'player_turns'

    def player_hit(self, player_id):
        if self.phase != 'player_turns':
            raise ValueError("No es el turno de los jugadores")
        if self.current_player_id != player_id:
            raise ValueError(f"No es el turno del jugador {player_id}")

        card  = self._draw_card()
        self.player_hands[player_id].append(card)
        score  = calculate_hand_score(self.player_hands[player_id])
        busted = score > 21

        if busted:
            self.player_done[player_id] = True
            self._advance_turn()

        return card, score, busted

    def player_stand(self, player_id):
        if self.current_player_id != player_id:
            raise ValueError(f"No es el turno del jugador {player_id}")
        self.player_done[player_id] = True
        self._advance_turn()

    def _advance_turn(self):
        self.current_player_index += 1

        while self.current_player_index < len(self.player_ids):
            pid = self.player_ids[self.current_player_index]
            if not self.player_done[pid]:
                break
            self.current_player_index += 1

        if self.current_player_index >= len(self.player_ids):
            self.phase              = 'dealer_turn'
            self.dealer_card_hidden = False

    def dealer_play(self):
        if self.phase != 'dealer_turn':
            raise ValueError("No es el turno del dealer")
        new_cards = []
        while True:
            score = calculate_hand_score(self.dealer_hand)
            if score >= 17:
                break
            card = self._draw_card()
            self.dealer_hand.append(card)
            new_cards.append(card)
        return new_cards

    def calculate_results(self):
        dealer_score = calculate_hand_score(self.dealer_hand)
        dealer_bj    = is_blackjack(self.dealer_hand)

        for pid in self.player_ids:
            hand  = self.player_hands[pid]
            score = calculate_hand_score(hand)
            bet   = 100

            if score > 21:
                result, delta = 'bust', -bet
            elif is_blackjack(hand) and not dealer_bj:
                result, delta = 'blackjack', int(bet * 1.5)
            elif dealer_bj and not is_blackjack(hand):
                result, delta = 'lose', -bet
            elif dealer_score > 21:
                result, delta = 'win', bet
            elif score > dealer_score:
                result, delta = 'win', bet
            elif score == dealer_score:
                result, delta = 'push', 0
            else:
                result, delta = 'lose', -bet

            self.results[pid] = {
                'result':      result,
                'chips_delta': delta,
                'score':       score
            }

        self.phase = 'finished'
        return self.results

    def _draw_card(self):
        if not self.deck:
            raise ValueError("El mazo está vacío")
        return self.deck.pop()

    @property
    def current_player_id(self):
        if (self.phase == 'player_turns' and
                self.current_player_index < len(self.player_ids)):
            return self.player_ids[self.current_player_index]
        return None

    def get_public_state(self, requesting_player_id):
        dealer_cards = list(self.dealer_hand)
        if self.dealer_card_hidden and len(dealer_cards) > 1:
            dealer_cards[1] = {
                'suit': 'hidden', 'value': '?', 'numeric': 0, 'id': 'hidden'
            }

        players_state = {}
        for pid in self.player_ids:
            hand  = self.player_hands[pid]
            score = calculate_hand_score(hand)

            if pid == requesting_player_id:
                # El jugador ve sus propias cartas completas
                visible_cards = hand
                visible_score = score
            else:
                # Las cartas de otros jugadores: solo la primera visible,
                # las demás ocultas
                visible_cards = []
                for i, card in enumerate(hand):
                    if i == 0:
                        visible_cards.append(card)
                    else:
                        visible_cards.append({
                            'suit': 'hidden',
                            'value': '?',
                            'numeric': 0,
                            'id': f'hidden_{pid}_{i}'
                        })
                visible_score = '?'

            players_state[pid] = {
                'cards':  visible_cards,
                'score':  visible_score,
                'busted': score > 21,
                'done':   self.player_done[pid]
            }

        prob_data = {}
        if (requesting_player_id in self.player_hands and
                len(self.dealer_hand) > 0 and
                self.phase == 'player_turns' and
                self.current_player_id == requesting_player_id):
            dealer_visible = self.dealer_hand[0]
            prob_data = compute_probabilities_for_player(
                self.player_hands[requesting_player_id],
                dealer_visible,
                self.deck
            )

        return {
            'game_id':        self.game_id,
            'phase':          self.phase,
            'current_turn':   self.current_player_id,
            'dealer':         {
                'cards': dealer_cards,
                'score': calculate_hand_score(self.dealer_hand)
                         if not self.dealer_card_hidden else '?'
            },
            'players':        players_state,
            'probabilities':  prob_data,
            'deck_remaining': len(self.deck),
            'results':        self.results if self.phase == 'finished' else {}
        }


_active_games: Dict[int, GameState] = {}


def get_game_state(game_id):
    return _active_games.get(game_id)


def set_game_state(game_id, state):
    _active_games[game_id] = state


def remove_game_state(game_id):
    _active_games.pop(game_id, None)