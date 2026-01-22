import { Terminal, CheckCircle, Clock, XCircle, Brain, User } from 'lucide-react';

interface Command {
  id: string;
  type: string;
  timestamp: Date;
  status: 'success' | 'pending' | 'failed';
  source?: 'user' | 'ai';
}

interface CommandLogProps {
  commands: Command[];
  mode: 'scout' | 'survivor';
}

export function CommandLog({ commands, mode }: CommandLogProps) {
  const getStatusIcon = (status: Command['status']) => {
    switch (status) {
      case 'success':
        return <CheckCircle className="w-4 h-4 text-green-500" />;
      case 'pending':
        return <Clock className="w-4 h-4 text-yellow-500 animate-pulse" />;
      case 'failed':
        return <XCircle className="w-4 h-4 text-red-500" />;
    }
  };

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString('en-US', { 
      hour12: false,
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    });
  };

  const aiCommands = commands.filter(c => c.source === 'ai');
  const userCommands = commands.filter(c => c.source === 'user' || !c.source);

  return (
    <div className={`rounded-lg p-2 ${
      mode === 'scout' ? 'bg-white border border-gray-200 shadow-sm' : 'bg-white/50 border border-gray-200'
    }`}>
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-1.5">
          <div className={`p-1 rounded-lg ${mode === 'scout' ? 'bg-green-50' : 'bg-gray-100'}`}>
            <Terminal className={`w-3.5 h-3.5 ${mode === 'scout' ? 'text-green-600' : 'text-gray-400'}`} />
          </div>
          <div>
            <h2 className="text-gray-900 text-xs">Mission Log</h2>
            <p className="text-xs text-gray-500">History</p>
          </div>
        </div>
        <div className={`px-1.5 py-0.5 rounded flex items-center gap-1 ${
          mode === 'scout' 
            ? 'bg-green-50 text-green-600' 
            : 'bg-gray-100 text-gray-500'
        }`}>
          <div className={`w-1 h-1 rounded-full ${mode === 'scout' ? 'bg-green-600 animate-pulse' : 'bg-gray-500'}`} />
          <span className="text-xs">{mode === 'scout' ? 'STREAM' : 'PAUSE'}</span>
        </div>
      </div>

      {mode === 'survivor' && (
        <div className="bg-gray-50 rounded p-1.5 mb-2 flex items-start gap-1.5 border border-gray-200">
          <Brain className="w-3 h-3 text-gray-500 mt-0.5 flex-shrink-0" />
          <div className="text-xs text-gray-600">
            Logging suspended in autonomous mode
          </div>
        </div>
      )}

      {/* AI Control Log Section */}
      {aiCommands.length > 0 && (
        <div className="mb-2">
          <div className="flex items-center gap-1 mb-1 px-0.5">
            <Brain className="w-3 h-3 text-purple-600" />
            <h3 className="text-xs text-purple-700">AI</h3>
            <span className="text-xs text-purple-500 bg-purple-50 px-1 py-0.5 rounded">
              {aiCommands.length}
            </span>
          </div>
          <div className="space-y-1 max-h-24 overflow-y-auto">
            {aiCommands.map((command) => (
              <div
                key={command.id}
                className="rounded p-1.5 flex items-center justify-between bg-gradient-to-r from-purple-50 to-blue-50 border border-purple-100"
              >
                <div className="flex items-center gap-1.5 flex-1 min-w-0">
                  {getStatusIcon(command.status)}
                  <div className="flex-1 min-w-0">
                    <div className="text-xs font-mono text-gray-900 truncate">
                      {command.type}
                    </div>
                    <div className="text-xs text-gray-500 font-mono">
                      {formatTime(command.timestamp)}
                    </div>
                  </div>
                  <Brain className="w-3 h-3 text-purple-600 flex-shrink-0" />
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* User Commands Section */}
      <div>
        {userCommands.length > 0 && aiCommands.length > 0 && (
          <div className="flex items-center gap-1 mb-1 px-0.5">
            <User className="w-3 h-3 text-blue-600" />
            <h3 className="text-xs text-blue-700">User</h3>
            <span className="text-xs text-blue-500 bg-blue-50 px-1 py-0.5 rounded">
              {userCommands.length}
            </span>
          </div>
        )}
        <div className="space-y-1 max-h-28 overflow-y-auto">
          {commands.length === 0 ? (
            <div className="text-center py-4 text-gray-400">
              <p className="text-xs">No commands yet</p>
            </div>
          ) : userCommands.length === 0 && aiCommands.length > 0 ? (
            <div className="text-center py-3 text-gray-400 bg-gray-50 rounded">
              <p className="text-xs">No user commands</p>
            </div>
          ) : (
            userCommands.map((command) => (
              <div
                key={command.id}
                className={`rounded p-1.5 flex items-center justify-between border ${
                  mode === 'scout' ? 'bg-gray-50 border-gray-200' : 'bg-gray-50/50 border-gray-100'
                }`}
              >
                <div className="flex items-center gap-1.5 flex-1 min-w-0">
                  {getStatusIcon(command.status)}
                  <div className="flex-1 min-w-0">
                    <div className="text-xs font-mono text-gray-900 truncate">
                      {command.type}
                    </div>
                    <div className="text-xs text-gray-500 font-mono">
                      {formatTime(command.timestamp)}
                    </div>
                  </div>
                  <User className="w-3 h-3 text-blue-600 flex-shrink-0" />
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {commands.length > 0 && (
        <div className="mt-2 pt-2 border-t border-gray-200 grid grid-cols-2 gap-1.5 text-xs">
          <div className="bg-purple-50 rounded p-1 border border-purple-100">
            <div className="text-purple-600 text-xs">AI</div>
            <div className="text-sm text-purple-700 mt-0.5">{aiCommands.length}</div>
          </div>
          <div className="bg-blue-50 rounded p-1 border border-blue-100">
            <div className="text-blue-600 text-xs">User</div>
            <div className="text-sm text-blue-700 mt-0.5">{userCommands.length}</div>
          </div>
        </div>
      )}
    </div>
  );
}