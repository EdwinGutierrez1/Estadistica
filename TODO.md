# TODO - Ajustes turno dealer y reasignación de admin de sala

- [x] Ajustar `GameState.get_public_state` para que todos los jugadores vean a todos los jugadores completos.
- [x] Ajustar `on_start_game` para permitir iniciar partida con mínimo 3 jugadores activos.
- [x] Ajustar lógica de botón de inicio en frontend (`room.html` + `game.js`) para habilitar inicio con >= 3 jugadores.
- [x] Validar regla dealer no pide con 17+ y ejecución automática al final.

- [ ] Exponer turno explícito del dealer (`current_turn = 'dealer'`) durante fase dealer.
- [ ] Actualizar frontend para mostrar turno dealer y deshabilitar acciones de jugador en ese turno.
- [ ] Reasignar `admin_player_id` al siguiente jugador activo por orden de entrada cuando el admin salga.
- [ ] Aplicar la misma reasignación en salida por ruta HTTP y por socket.
- [ ] Sincronizar UI de lobby (botón iniciar) con el admin reasignado.
- [ ] Ejecutar validación mínima (compileall) al finalizar cambios.
