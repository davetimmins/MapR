using mapr.Modules;
using Microsoft.Owin.Extensions;
using Nancy;
using Nancy.Bootstrapper;
using Nancy.Conventions;
using Nancy.Diagnostics;
using Nancy.Pile;
using Nancy.TinyIoc;
using Owin;

namespace mapr
{
    public class Startup
    {
        public void Configuration(IAppBuilder app)
        {
            app.MapSignalR();
            app.UseNancy();
            app.UseStageMarker(PipelineStage.MapHandler);
        }
    }

    public class CustomBootstrapper : DefaultNancyBootstrapper
    {
        protected override void ApplicationStartup(TinyIoCContainer container, IPipelines pipelines)
        {
            base.ApplicationStartup(container, pipelines);

            container.Register<HomeModule, HomeModule>();

#if !DEBUG
            DiagnosticsHook.Disable(pipelines);
#endif

            pipelines.AfterRequest.AddItemToEndOfPipeline((ctx) =>
            {
                if (ctx.Response.StatusCode == HttpStatusCode.InternalServerError) return;

                ctx.Response.Headers.Add("X-Frame-Options", "deny");
                ctx.Response.Headers.Add("X-Download-Options", "noopen");
                ctx.Response.Headers.Add("X-Content-Type-Options", "nosniff");
                ctx.Response.Headers.Add("X-XSS-Protection", "1; mode=block");
            });
        }

#if DEBUG
        protected override DiagnosticsConfiguration DiagnosticsConfiguration
        {
            get { return new DiagnosticsConfiguration { Password = @"admin" }; }
        }
#endif

        protected override void ConfigureConventions(NancyConventions nancyConventions)
        {
            base.ConfigureConventions(nancyConventions);

            nancyConventions.StaticContentsConventions.Add(StaticContentConventionBuilder.AddDirectory("content"));
            nancyConventions.StaticContentsConventions.Add(StaticContentConventionBuilder.AddDirectory("scripts"));
            nancyConventions.StaticContentsConventions.Add(StaticContentConventionBuilder.AddDirectory("signalr"));

            nancyConventions.StaticContentsConventions.StyleBundle("styles.css", true,
                new[]
                {
                    "content/*.css"
                });

            nancyConventions.StaticContentsConventions.ScriptBundle("scripts.js", true,
                new[]
                {
                    "scripts/jquery.signalR-2.1.1.js",
                    "scripts/app.js"
                });
        }
    }
}