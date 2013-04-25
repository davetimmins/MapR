<%@ WebHandler Language="C#" Class="proxy" %>
/*
 * This proxy page does not have any security checks. It is highly recommended
 * that a user deploying this proxy page on their web server, add appropriate
 * security checks, for example checking request path, username/password, target
 * url, etc.
 * 
 * To debug through source code in this proxy, add debug="true" in WebHandler variable
 * at the top of this file then either host within a web application in IIS and attach to the IIS 
 * web server process (w3wp.exe) -or- place in a web application which hosts your 
 * Silverlight application. 
*/
using System;
using System.Drawing;
using System.IO;
using System.Web;
using System.Collections.Generic;
using System.Text;
using System.Xml.Serialization;
using System.Web.Caching;
using System.Net;

/// <summary>
/// Forwards requests to another web server. 
/// </summary>
public class proxy : IHttpHandler
{
    public void ProcessRequest(HttpContext context)
    {
        HttpResponse response = context.Response;

        // Get the URL requested by the client (take the entire query string at once
        // to handle the case of the URL itself containing query string parameters)
        string uri = HttpUtility.UrlDecode(context.Request.QueryString.ToString());

        // Optional: Ping to make sure proxy available (eg. http://localhost/TestApp/Simple/proxy.ashx?ping)
        if (uri.StartsWith("ping"))
        {
            context.Response.Write("Hello simple proxy");
            return;
        }

        // Filter URL, set properties or headers on webrequest (eg. Referer)        
        System.Net.WebRequest req = System.Net.WebRequest.Create(new Uri(uri));
        req.Method = context.Request.HttpMethod;
        
        // Set body of request for POST requests
        if (context.Request.InputStream.Length > 0)
        {
            byte[] bytes = new byte[context.Request.InputStream.Length];
            context.Request.InputStream.Read(bytes, 0, (int)context.Request.InputStream.Length);
            req.ContentLength = bytes.Length;
            req.ContentType = context.Request.ContentType;
            using (Stream outputStream = req.GetRequestStream())
            {
                outputStream.Write(bytes, 0, bytes.Length);
            }
        }

        // Send the request to the server
        System.Net.WebResponse serverResponse = null;
        try
        {
            serverResponse = req.GetResponse();
        }
        catch (System.Net.WebException webExc)
        {
            response.StatusCode = 500;
            response.StatusDescription = webExc.Status.ToString();
            response.Write(webExc.Response);
            response.End();
            return;
        }

        // Set up the response to the client
        if (serverResponse != null)
        {
            response.ContentType = serverResponse.ContentType;
            using (Stream byteStream = serverResponse.GetResponseStream())
            {
                byte[] outb = ReadFully(serverResponse.GetResponseStream(), 0);
                response.OutputStream.Write(outb, 0, outb.Length);
                serverResponse.Close();
            }
        }
        response.End();
    }

    /// <summary>
    /// Reads data from a stream until the end is reached. The
    /// data is returned as a byte array. An IOException is
    /// thrown if any of the underlying IO calls fail.
    /// </summary>
    /// <param name="stream">The stream to read data from</param>
    /// <param name="initialLength">The initial buffer length</param>
    public static byte[] ReadFully(Stream stream, int initialLength)
    {
        // If we've been passed an unhelpful initial length, just
        // use 32K.
        if (initialLength < 1)
        {
            initialLength = 32768;
        }

        byte[] buffer = new byte[initialLength];
        int read = 0;

        int chunk;
        while ((chunk = stream.Read(buffer, read, buffer.Length - read)) > 0)
        {
            read += chunk;

            // If we've reached the end of our buffer, check to see if there's
            // any more information
            if (read == buffer.Length)
            {
                int nextByte = stream.ReadByte();

                // End of stream? If so, we're done
                if (nextByte == -1)
                {
                    return buffer;
                }

                // Nope. Resize the buffer, put in the byte we've just
                // read, and continue
                byte[] newBuffer = new byte[buffer.Length * 2];
                Array.Copy(buffer, newBuffer, buffer.Length);
                newBuffer[read] = (byte)nextByte;
                buffer = newBuffer;
                read++;
            }
        }
        // Buffer is now too big. Shrink it.
        byte[] ret = new byte[read];
        Array.Copy(buffer, ret, read);
        return ret;
    }

    public bool IsReusable
    {
        get
        {
            return false;
        }
    }
}

