import { create } from "zustand";
import toast from "react-hot-toast";
import { useAuthStore } from "./useAuthStore";
import { useChatStore } from "./useChatStore";

const rtcConfig = {
  iceServers: [{ urls: "stun:stun.l.google.com:19302" }],
};

async function safeAddIceCandidate(peerConnection, candidate) {
  try {
    await peerConnection.addIceCandidate(new RTCIceCandidate(candidate));
  } catch (error) {
    console.error("Failed to add ICE candidate:", error);
  }
}

function findUserById(userId) {
  const { chats, allContacts, selectedUser } = useChatStore.getState();
  if (selectedUser?._id === userId) return selectedUser;
  return [...chats, ...allContacts].find((user) => user._id === userId) || null;
}

export const useCallStore = create((set, get) => ({
  incomingCall: null,
  outgoingCall: null,
  activeCall: null,
  localStream: null,
  remoteStream: null,
  peerConnection: null,
  isConnecting: false,
  isMuted: false,
  isCameraOff: false,
  listenersBound: false,
  boundSocket: null,
  pendingCandidates: [],
  listeners: {},

  ensureLocalStream: async () => {
    const existingStream = get().localStream;
    if (existingStream) return existingStream;

    const stream = await navigator.mediaDevices.getUserMedia({
      audio: true,
      video: true,
    });
    set({ localStream: stream, isMuted: false, isCameraOff: false });
    return stream;
  },

  createPeerConnection: async (peerUserId) => {
    const socket = useAuthStore.getState().socket;
    const localStream = await get().ensureLocalStream();

    if (!socket) {
      throw new Error("Socket connection is not ready");
    }

    if (get().peerConnection) {
      get().peerConnection.close();
    }

    const peerConnection = new RTCPeerConnection(rtcConfig);

    localStream.getTracks().forEach((track) => {
      peerConnection.addTrack(track, localStream);
    });

    peerConnection.ontrack = (event) => {
      set({ remoteStream: event.streams[0] });
    };

    peerConnection.onicecandidate = (event) => {
      if (!event.candidate) return;
      socket.emit("call:signal", { to: peerUserId, candidate: event.candidate });
    };

    peerConnection.onconnectionstatechange = () => {
      const state = peerConnection.connectionState;
      if (state === "disconnected" || state === "failed" || state === "closed") {
        get().endCall({ notifyPeer: false, silent: true });
      }
    };

    set({ peerConnection, pendingCandidates: [] });
    return peerConnection;
  },

  startCall: async (user) => {
    const socket = useAuthStore.getState().socket;
    if (!socket) {
      toast.error("Socket is not connected");
      return;
    }

    if (get().incomingCall || get().outgoingCall || get().activeCall) {
      toast.error("A call is already in progress");
      return;
    }

    try {
      set({ isConnecting: true });

      const peerConnection = await get().createPeerConnection(user._id);
      const offer = await peerConnection.createOffer();
      await peerConnection.setLocalDescription(offer);

      set({
        outgoingCall: { to: user._id, user },
        isConnecting: false,
      });

      socket.emit("call:invite", {
        to: user._id,
        offer,
      });
    } catch (error) {
      console.error("Error while starting call:", error);
      toast.error("Could not start video call");
      get().endCall({ notifyPeer: false, silent: true });
    } finally {
      set({ isConnecting: false });
    }
  },

  acceptCall: async () => {
    const socket = useAuthStore.getState().socket;
    const incomingCall = get().incomingCall;
    if (!socket || !incomingCall) return;

    try {
      const peerConnection = await get().createPeerConnection(incomingCall.from);
      await peerConnection.setRemoteDescription(
        new RTCSessionDescription(incomingCall.offer)
      );

      const queuedCandidates = get().pendingCandidates;
      for (const candidate of queuedCandidates) {
        await safeAddIceCandidate(peerConnection, candidate);
      }

      const answer = await peerConnection.createAnswer();
      await peerConnection.setLocalDescription(answer);

      socket.emit("call:accept", {
        to: incomingCall.from,
        answer,
      });

      set({
        activeCall: {
          peerUserId: incomingCall.from,
          peerUser: incomingCall.fromUser || findUserById(incomingCall.from),
        },
        incomingCall: null,
      });
    } catch (error) {
      console.error("Error while accepting call:", error);
      toast.error("Could not accept call");
      get().endCall({ notifyPeer: false, silent: true });
    }
  },

  rejectCall: () => {
    const socket = useAuthStore.getState().socket;
    const incomingCall = get().incomingCall;
    if (!incomingCall) return;

    if (socket) {
      socket.emit("call:reject", { to: incomingCall.from });
    }

    set({ incomingCall: null });
  },

  endCall: ({ notifyPeer = true, silent = false } = {}) => {
    const socket = useAuthStore.getState().socket;
    const { activeCall, outgoingCall, incomingCall, localStream, peerConnection, remoteStream } =
      get();
    const peerId = activeCall?.peerUserId || outgoingCall?.to || incomingCall?.from;

    if (notifyPeer && socket && peerId) {
      socket.emit("call:end", { to: peerId });
    }

    if (peerConnection) {
      peerConnection.ontrack = null;
      peerConnection.onicecandidate = null;
      peerConnection.onconnectionstatechange = null;
      peerConnection.close();
    }

    if (localStream) {
      localStream.getTracks().forEach((track) => track.stop());
    }

    if (remoteStream) {
      remoteStream.getTracks().forEach((track) => track.stop());
    }

    set({
      incomingCall: null,
      outgoingCall: null,
      activeCall: null,
      localStream: null,
      remoteStream: null,
      peerConnection: null,
      isConnecting: false,
      isMuted: false,
      isCameraOff: false,
      pendingCandidates: [],
    });

    if (!silent) {
      toast.success("Call ended");
    }
  },

  toggleMute: () => {
    const localStream = get().localStream;
    if (!localStream) return;

    const nextMuted = !get().isMuted;
    localStream.getAudioTracks().forEach((track) => {
      track.enabled = !nextMuted;
    });
    set({ isMuted: nextMuted });
  },

  toggleCamera: () => {
    const localStream = get().localStream;
    if (!localStream) return;

    const nextCameraOff = !get().isCameraOff;
    localStream.getVideoTracks().forEach((track) => {
      track.enabled = !nextCameraOff;
    });
    set({ isCameraOff: nextCameraOff });
  },

  initCallListeners: () => {
    const socket = useAuthStore.getState().socket;
    if (!socket) return;

    if (get().listenersBound && get().boundSocket === socket) return;
    if (get().listenersBound && get().boundSocket && get().boundSocket !== socket) {
      get().removeCallListeners(get().boundSocket);
    }

    const handleIncoming = ({ from, fromUser, offer }) => {
      const { incomingCall, activeCall, outgoingCall } = get();

      if (incomingCall || activeCall || outgoingCall) {
        socket.emit("call:reject", { to: from });
        return;
      }

      set({ incomingCall: { from, fromUser, offer } });
      toast.success(`${fromUser?.fullName || "Someone"} is calling you`);
    };

    const handleAccepted = async ({ from, answer }) => {
      const { peerConnection, outgoingCall } = get();
      if (!peerConnection || !outgoingCall || outgoingCall.to !== from) return;

      try {
        await peerConnection.setRemoteDescription(new RTCSessionDescription(answer));

        const queuedCandidates = get().pendingCandidates;
        for (const candidate of queuedCandidates) {
          await safeAddIceCandidate(peerConnection, candidate);
        }

        set({
          activeCall: {
            peerUserId: from,
            peerUser: outgoingCall.user || findUserById(from),
          },
          outgoingCall: null,
        });
      } catch (error) {
        console.error("Error handling accepted call:", error);
        get().endCall({ notifyPeer: false, silent: true });
      }
    };

    const handleRejected = ({ from }) => {
      if (get().outgoingCall?.to !== from) return;
      toast.error("Call was rejected");
      get().endCall({ notifyPeer: false, silent: true });
    };

    const handleEnded = ({ from }) => {
      const peerId =
        get().activeCall?.peerUserId ||
        get().outgoingCall?.to ||
        get().incomingCall?.from;
      if (peerId && peerId !== from) return;
      get().endCall({ notifyPeer: false, silent: true });
      toast("Call ended by the other user");
    };

    const handleSignal = async ({ from, candidate }) => {
      const peerConnection = get().peerConnection;
      if (!peerConnection) return;

      if (!peerConnection.remoteDescription) {
        const pendingCandidates = get().pendingCandidates;
        set({ pendingCandidates: [...pendingCandidates, candidate] });
        return;
      }

      await safeAddIceCandidate(peerConnection, candidate);
    };

    const handleCallError = ({ type, message }) => {
      if (type === "offline") {
        toast.error(message || "User is offline");
      } else {
        toast.error(message || "Call error");
      }
      get().endCall({ notifyPeer: false, silent: true });
    };

    const handleSocketDisconnect = () => {
      get().endCall({ notifyPeer: false, silent: true });
    };

    const handleUserDisconnected = ({ userId }) => {
      const peerId =
        get().activeCall?.peerUserId ||
        get().outgoingCall?.to ||
        get().incomingCall?.from;
      if (!peerId || peerId !== userId) return;
      get().endCall({ notifyPeer: false, silent: true });
      toast("The user disconnected");
    };

    socket.on("call:incoming", handleIncoming);
    socket.on("call:accepted", handleAccepted);
    socket.on("call:rejected", handleRejected);
    socket.on("call:ended", handleEnded);
    socket.on("call:signal", handleSignal);
    socket.on("call:error", handleCallError);
    socket.on("call:user-disconnected", handleUserDisconnected);
    socket.on("disconnect", handleSocketDisconnect);

    set({
      listenersBound: true,
      boundSocket: socket,
      listeners: {
        handleIncoming,
        handleAccepted,
        handleRejected,
        handleEnded,
        handleSignal,
        handleCallError,
        handleSocketDisconnect,
        handleUserDisconnected,
      },
    });
  },

  removeCallListeners: (targetSocket = null) => {
    const socket = targetSocket || get().boundSocket || useAuthStore.getState().socket;
    const { listeners, listenersBound } = get();

    if (!socket || !listenersBound) return;

    socket.off("call:incoming", listeners.handleIncoming);
    socket.off("call:accepted", listeners.handleAccepted);
    socket.off("call:rejected", listeners.handleRejected);
    socket.off("call:ended", listeners.handleEnded);
    socket.off("call:signal", listeners.handleSignal);
    socket.off("call:error", listeners.handleCallError);
    socket.off("call:user-disconnected", listeners.handleUserDisconnected);
    socket.off("disconnect", listeners.handleSocketDisconnect);

    set({
      listenersBound: false,
      boundSocket: null,
      listeners: {},
    });
  },
}));
