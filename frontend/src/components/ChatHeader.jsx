import { PhoneCall, XIcon } from "lucide-react";
import { useChatStore } from "../store/useChatStore";
import { useEffect } from "react";
import { useAuthStore } from "../store/useAuthStore";
import { useCallStore } from "../store/useCallStore";
import toast from "react-hot-toast";

function ChatHeader() {
  const { selectedUser, setSelectedUser } = useChatStore();
  const { onlineUsers } = useAuthStore();
  const { startCall, incomingCall, outgoingCall, activeCall } = useCallStore();
  const isOnline = onlineUsers.includes(selectedUser._id);
  const isCallBusy = Boolean(incomingCall || outgoingCall || activeCall);

  const handleStartCall = () => {
    if (!isOnline) {
      toast.error("User must be online to start a video call");
      return;
    }
    startCall(selectedUser);
  };

  useEffect(() => {
    const handleEscKey = (event) => {
      if (event.key === "Escape") setSelectedUser(null);
    };

    window.addEventListener("keydown", handleEscKey);

    // cleanup function
    return () => window.removeEventListener("keydown", handleEscKey);
  }, [setSelectedUser]);

  return (
    <div
      className="flex justify-between items-center bg-slate-800/50 border-b
   border-slate-700/50 max-h-[84px] px-6 flex-1"
    >
      <div className="flex items-center space-x-3">
        <div className={`avatar ${isOnline ? "online" : "offline"}`}>
          <div className="w-12 rounded-full">
            <img
              src={selectedUser.profilePic || "/avatar.png"}
              alt={selectedUser.fullName}
            />
          </div>
        </div>

        <div>
          <h3 className="text-slate-200 font-medium">
            {selectedUser.fullName}
          </h3>
          <p className="text-slate-400 text-sm">
            {isOnline ? "Online" : "Offline"}
          </p>
        </div>
      </div>

      <div className="flex items-center gap-2">
        <button
          onClick={handleStartCall}
          disabled={!isOnline || isCallBusy}
          title={!isOnline ? "User is offline" : "Start video call"}
          className="btn btn-sm bg-slate-800 border-slate-700 text-slate-200 hover:bg-slate-700 disabled:opacity-50"
        >
          <PhoneCall className="size-4" />
          Video Call
        </button>
        <button onClick={() => setSelectedUser(null)}>
          <XIcon className="w-5 h-5 text-slate-400 hover:text-slate-200 transition-colors cursor-pointer" />
        </button>
      </div>
    </div>
  );
}
export default ChatHeader;
