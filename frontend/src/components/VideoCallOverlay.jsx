import { useEffect, useMemo, useRef } from "react";
import {
  Mic,
  MicOff,
  PhoneCall,
  PhoneOff,
  Video,
  VideoOff,
} from "lucide-react";
import { useAuthStore } from "../store/useAuthStore";
import { useCallStore } from "../store/useCallStore";

function VideoCallOverlay() {
  const { socket } = useAuthStore();
  const {
    incomingCall,
    outgoingCall,
    activeCall,
    localStream,
    remoteStream,
    isMuted,
    isCameraOff,
    acceptCall,
    rejectCall,
    endCall,
    toggleMute,
    toggleCamera,
    initCallListeners,
    removeCallListeners,
  } = useCallStore();

  const remoteVideoRef = useRef(null);
  const localVideoRef = useRef(null);

  useEffect(() => {
    if (!socket) return;
    initCallListeners();
    return () => removeCallListeners();
  }, [socket, initCallListeners, removeCallListeners]);

  useEffect(() => {
    if (!remoteVideoRef.current) return;
    remoteVideoRef.current.srcObject = remoteStream || null;
  }, [remoteStream]);

  useEffect(() => {
    if (!localVideoRef.current) return;
    localVideoRef.current.srcObject = localStream || null;
  }, [localStream]);

  const peerName = useMemo(() => {
    if (activeCall?.peerUser?.fullName) return activeCall.peerUser.fullName;
    if (outgoingCall?.user?.fullName) return outgoingCall.user.fullName;
    if (incomingCall?.fromUser?.fullName) return incomingCall.fromUser.fullName;
    return "User";
  }, [activeCall, outgoingCall, incomingCall]);

  if (!incomingCall && !outgoingCall && !activeCall) return null;

  if (incomingCall && !activeCall) {
    return (
      <div className="absolute inset-0 z-50 bg-slate-950/90 backdrop-blur-sm flex items-center justify-center p-4">
        <div className="w-full max-w-md bg-slate-900 border border-slate-700 rounded-2xl p-6 text-center space-y-5">
          <p className="text-slate-300 text-sm">Incoming video call</p>
          <h3 className="text-xl font-semibold text-slate-100">{peerName}</h3>

          <div className="flex items-center justify-center gap-4">
            <button
              onClick={rejectCall}
              className="btn btn-error text-white rounded-full"
            >
              <PhoneOff className="size-5" />
              Decline
            </button>
            <button
              onClick={acceptCall}
              className="btn btn-success text-white rounded-full"
            >
              <PhoneCall className="size-5" />
              Accept
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (outgoingCall && !activeCall) {
    return (
      <div className="absolute inset-0 z-50 bg-slate-950/90 backdrop-blur-sm flex items-center justify-center p-4">
        <div className="w-full max-w-md bg-slate-900 border border-slate-700 rounded-2xl p-6 text-center space-y-5">
          <p className="text-slate-300 text-sm">Calling...</p>
          <h3 className="text-xl font-semibold text-slate-100">{peerName}</h3>
          <p className="text-slate-400 text-sm">
            Waiting for user to accept the call
          </p>

          <button onClick={() => endCall()} className="btn btn-error rounded-full">
            <PhoneOff className="size-5" />
            Cancel
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="absolute inset-0 z-50 bg-slate-950/95 backdrop-blur-sm p-4 md:p-6">
      <div className="h-full w-full max-w-5xl mx-auto flex flex-col gap-4">
        <div className="flex items-center justify-between">
          <h3 className="text-slate-100 font-medium">In call with {peerName}</h3>
        </div>

        <div className="relative flex-1 rounded-2xl overflow-hidden border border-slate-700 bg-slate-900">
          {remoteStream ? (
            <video
              ref={remoteVideoRef}
              autoPlay
              playsInline
              className="w-full h-full object-cover"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-slate-400">
              Waiting for remote video...
            </div>
          )}

          <div className="absolute bottom-4 right-4 w-44 md:w-60 rounded-xl overflow-hidden border border-slate-600 bg-slate-800">
            <video
              ref={localVideoRef}
              autoPlay
              muted
              playsInline
              className="w-full aspect-video object-cover"
            />
          </div>
        </div>

        <div className="flex items-center justify-center gap-3">
          <button
            onClick={toggleMute}
            className="btn btn-circle bg-slate-800 border-slate-700 hover:bg-slate-700"
          >
            {isMuted ? (
              <MicOff className="size-5 text-red-400" />
            ) : (
              <Mic className="size-5 text-slate-100" />
            )}
          </button>
          <button
            onClick={toggleCamera}
            className="btn btn-circle bg-slate-800 border-slate-700 hover:bg-slate-700"
          >
            {isCameraOff ? (
              <VideoOff className="size-5 text-red-400" />
            ) : (
              <Video className="size-5 text-slate-100" />
            )}
          </button>
          <button onClick={() => endCall()} className="btn btn-error btn-circle">
            <PhoneOff className="size-5" />
          </button>
        </div>
      </div>
    </div>
  );
}

export default VideoCallOverlay;
