using Microsoft.AspNet.SignalR;
using System;
using System.Collections.Concurrent;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using System.Web;

namespace MapR.Web
{
    public class LocationHub : Hub
    {
        static ConcurrentDictionary<string, object> _graphics = new ConcurrentDictionary<string, object>();

        public void Add(object json)
        {          
            foreach (var graphic in _graphics)
                Clients.Caller.addGraphic(graphic.Key, graphic.Value);

            Clients.Others.addGraphic(Context.ConnectionId, json);

            _graphics.TryAdd(Context.ConnectionId, json);
        }

        public void Update(string id, object json)
        {
            _graphics.AddOrUpdate(id, json, (key, oldValue) => json);
            Clients.Others.updateGraphic(id, json);
        }

        public override Task OnDisconnected()
        {
            object removed;
            _graphics.TryRemove(Context.ConnectionId, out removed);
            return Clients.All.leave(Context.ConnectionId);
        }
    }
}