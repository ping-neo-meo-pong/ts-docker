import {
  ConnectedSocket,
  MessageBody,
  OnGatewayConnection,
  OnGatewayDisconnect,
  OnGatewayInit,
  SubscribeMessage,
  WebSocketGateway,
  WebSocketServer,
  WsResponse,
} from '@nestjs/websockets';
import { from, Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { Server, Socket } from 'socket.io';
import { Logger } from '@nestjs/common';
import { emit } from 'process';

let loop = null;
let champ = 0;
var data = {
	game: {
		H: 400,
		W: 700,
		UD_d: 20,
		bar_d: 50
	},

	p1: {
		mouse_y: 0,
		score: 0
	},
	p2: {
		mouse_y: 0,
		score: 0
	},
	ball: {
		x: 100,
		y: 100,
		v_x: 9,
		v_y: 9
	}
};

@WebSocketGateway({ transports: ['websocket'] })
export class EventsGateway
  implements OnGatewayConnection, OnGatewayDisconnect, OnGatewayInit
{
  @WebSocketServer()
  server: Server;
  logger: Logger = new Logger('EventsGateway');

  afterInit(server: Server) {
    console.count('Init');
  }
  handleDisconnect(client: Socket) {
    console.log(`disconnect ${client}`);
  }
  //   @SubscribeMessage('events')
  //   findAll(@MessageBody() data: any): Observable<WsResponse<number>> {
  //     return from([1, 2, 3]).pipe(
  //       map((item) => ({ event: 'events', data: item })),
  //     );
  //   }
  //   @SubscribeMessage('identity')
  //   async identity(@MessageBody() data: number): Promise<number> {
  //     return data;
  //   }
  handleConnection(client: Socket) {
    console.log(`connect ${client.id}`);
  }
  @SubscribeMessage('pleaseMakeRoom')
  makeRoom(@ConnectedSocket() client: Socket, @MessageBody() roomId: string) {
    client.join(roomId);
    client.emit('roomId', roomId);
    console.log(roomId);
  }
  @SubscribeMessage('send_message')
  send_message(@ConnectedSocket() client: Socket, @MessageBody() data: any) {
    console.log(`@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@`);
    console.log(data);
    // client.in(data[0]).emit('server_message', data[1]);
    console.log(data[0]);
    this.server.in(data[0]).emit('server_message', data[1]);
  }
  @SubscribeMessage('id')
  id_print(@MessageBody('id') data: number) {
    console.log(data);
  }

  // @@@@@@@@@@@@@@@@@@@@@@@     game    @@@@@@@@@@@@@@@@@@@@@@@@
  @SubscribeMessage('im_gamer')
  im_gamer(@ConnectedSocket() client: Socket) {
		client.on('disconnect', () => {
			clearInterval(loop);
			champ--;
			console.log(`disconnected: ${client.id}`);
		});
    if (champ < 2) {
		  champ++;
    }
    console.log("send LR!")
    client.emit("LR", champ);
		if (champ >= 2) {
      clearInterval(loop);
			loop = setInterval(() => {
				this.server.emit("game_data", data);
				// console.log(data);
        console.log(champ);
				if (champ >= 2) {
					ball_engine();
				}
			}, 1000 / 30);
		}
    else
      clearInterval(loop);
	};
  @SubscribeMessage('p1')
	p1(@ConnectedSocket() client: Socket, @MessageBody() m_y: number) {
		// data.mouse_x = m_x;
		data.p1.mouse_y = m_y;
	};
  @SubscribeMessage('p2')
	p2(@ConnectedSocket() client: Socket, @MessageBody() m_y: number) {
		// data.mouse_x = m_x;
		data.p2.mouse_y = m_y;
	};
  @SubscribeMessage('gameOut')
	gameOut() {
    console.log(champ);
    clearInterval(loop);
    if (champ > 0)
      champ--;
	};
}

function ball_engine() {

	check_wall();
	check_bar();

	// data.ball.old_x = data.ball.x;
	// data.ball.old_y = data.ball.y;
	data.ball.x += data.ball.v_x;
	data.ball.y += data.ball.v_y;
}

function check_wall() {
	if (data.ball.x + data.ball.v_x > data.game.W - 20) { // right
		data.ball.v_x *= -1;
		data.p1.score += 1;
	}
	else if (data.ball.x + data.ball.v_x < 0) { // left
		data.ball.v_x *= -1;
		data.p2.score += 1;
	}
	if (data.ball.y + data.ball.v_y > data.game.H - data.game.UD_d - 20) { // down
		data.ball.v_y *= -1;
	}
	else if (data.ball.y + data.ball.v_y < data.game.UD_d) { // up
		data.ball.v_y *= -1;
	}
}

function check_bar() {
	if (data.ball.x + data.ball.v_x > data.game.bar_d && data.ball.x + data.ball.v_x < data.game.bar_d + 20 && Math.abs(data.ball.y + data.ball.v_y - data.p1.mouse_y) < 40) {
		data.ball.v_x = Math.abs(data.ball.v_x);
	}
	else if (data.ball.x + data.ball.v_x < data.game.W - data.game.bar_d - 20 && data.ball.x + data.ball.v_x > data.game.W - data.game.bar_d - 40 && Math.abs(data.ball.y + data.ball.v_y - data.p2.mouse_y) < 40) {
		if (data.ball.v_x > 0)
			data.ball.v_x *= -1;
	}
}