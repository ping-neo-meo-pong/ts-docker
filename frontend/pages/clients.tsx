// import { Socket } from "socket.io-client";
import Router, { useRouter } from "next/router";
import { useEffect, useState } from "react";
import { io, Socket } from "socket.io-client";
import axios from "axios";

import { user_data } from "./login";

export let socket: Socket;
export default function Client() {
  const router = useRouter();
  let [result, setResult]: any = useState([]);
  useEffect(useEffectHandler, []);
  function useEffectHandler() {
    socket = io("http://localhost", { transports: ["websocket"] });
    console.log(socket);
    axios
      .get("/api/dm", {
        headers: {
          Authorization: `Bearer ${user_data._token}`,
        },
      })
      .then(function (response) {
        user_data._room = response.data;
        // console.log("room:");
        // console.log(user_data._room);
        for (let i = 0; user_data._room[i]; i++) {
          console.log(i);
          result.push(
            <button
              key={user_data._room[i].id}
              onClick={() => {
                onClickDmRoom(i);
              }}
            >
              room {user_data._room[i].id}
            </button>
          );
        }
        setResult([...result]);
        console.log(result);
      })
      .catch(() => {
        router.push("/login");
      });
    function onClickDmRoom(i: number) {
      router.push(`/dm/${user_data._room[i].id}`);
    }
    console.log(`hi name`);
    console.log(user_data._name);
  }
  function onClickGamePage() {
    router.push('/game');
  }

  return (
    <div>
      <h1>HI! {user_data._name} {user_data._token.slice(55, 60)} </h1>
      <h2>Room</h2>
      {result}
      <h2>Game</h2>
      <button onClick={onClickGamePage}> make game </button> <br />
      <button onClick={champClean}> champ clean </button>
    </div>
  );
}

function champClean() {
	socket.emit("gameOut");
}

function GoToDmRoom() {
  let router = useRouter();
  let result: JSX.Element[] = [];
  function onClickDmRoom() {
    router.push("/dm");
  }
  useEffect(() => {
    // axios
    //   .get("/api/dm", {
    //     headers: {
    //       Authorization: `Bearer ${user_data._token}`,
    //     },
    //   })
    //   .then(function (response) {
    //     user_data._room = response.data;
    //     // console.log("room:");
    //     // console.log(user_data._room);
    //   })
    //   .catch(() => {
    //     router.push("/login");
    //   });
  }, []);
  //   console.log("retult:");
  //   console.log(result);

  // return (
  //   <div>
  //     <button onClick={onClickDmRoom}>go to dm room</button>
  //   </div>
  // );
}
