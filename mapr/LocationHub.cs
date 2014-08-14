using Microsoft.AspNet.SignalR;
using System.Collections.Concurrent;
using System.Threading.Tasks;

namespace MapR
{
    public class LocationHub : Hub
    {
        static ConcurrentDictionary<string, object> _graphics = new ConcurrentDictionary<string, object>();

        public void Add(object json)
        {
            foreach (var graphic in _graphics)
                Clients.Caller.addGraphic(graphic.Value);

            Clients.Others.addGraphic(json);

            _graphics.TryAdd(Context.ConnectionId, json);
        }

        public void Update(string id, object json)
        {
            _graphics.AddOrUpdate(id, json, (key, oldValue) => json);
            Clients.Others.updateGraphic(id, json);
        }

        public override Task OnDisconnected(bool stopCalled)
        {
            base.OnDisconnected(stopCalled);

            object removed;
            _graphics.TryRemove(Context.ConnectionId, out removed);
            return Clients.All.leave(Context.ConnectionId);
        }
    }
}