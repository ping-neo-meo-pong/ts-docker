// import { Socket } from "socket.io-client";
import Router, { useRouter } from "next/router";
import { useEffect, useState } from "react";
import { io, Socket } from "socket.io-client";
import axios from "axios";

import { user_data } from "./login";

export let socket: Socket;
export default function Client() {
  const router = useRouter();

  let [dmRoomList, setDmRoomList]: any = useState([]);
  useEffect(initSocketConnection, []);

  function initSocketConnection() {
    socket = io("http://localhost", { transports: ["websocket"] });
    socket.on('disconnect', () => {
      console.log('disconnected');
    });
    socket.emit('authorize', user_data._token);

    axios
      .get("/api/dm")
      .then(function (response) {
        user_data._room = response.data;
        for (let dmRoom of user_data._room)
          dmRoomList.push(<GoToDmRoom key={dmRoom.id} dmRoom={dmRoom} />)
        setDmRoomList([...dmRoomList]);
      })
      .catch(() => {
        router.push("/login");
      });

  }
  function onClickGamePage() {
    router.push('/game');
  }
  return (
    <div>
      <h1>DM room list</h1>
      {dmRoomList}
      <button onClick={onClickGamePage}> make game </button> <br />
    </div>
  );

  function champClean() {
    socket.emit("gameOut");
  }

  function GoToDmRoom({ dmRoom }: any) {
    let router = useRouter();
    let result: JSX.Element[] = [];

    function onClickDmRoom() {
      router.push(`/dm/${dmRoom.id}`);
    }

    return (
      <div>
        <button onClick={onClickDmRoom}>roomid: {dmRoom.id}</button>
      </div>
    );
  }
}
