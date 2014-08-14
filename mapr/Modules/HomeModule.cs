using Nancy;
using System;

namespace mapr.Modules
{
    public class HomeModule : NancyModule
    {
        public HomeModule()
        {
            Get["/"] = parameters => { return View["index"]; };
        }
    }
}