/**************************************************
// commmon.js
// Implementation file for ScrapBook
// 
// Description: common class, functions and services
// Author: Gomita
// Contributors: 
// 
// Version: 
// License: see LICENSE.txt
**************************************************/


const NS_SCRAPBOOK = "http://amb.vis.ne.jp/mozilla/scrapbook-rdf#";

function ScrapBookItem(aID)
{
	this.id      = aID;
	this.type    = "";
	this.title   = "";
	this.chars   = "";
	this.icon    = "";
	this.source  = "";
	this.comment = "";
	this.content = "";
}



var SBservice = {
	RDF    : Components.classes['@mozilla.org/rdf/rdf-service;1'].getService(Components.interfaces.nsIRDFService),
	RDFC   : Components.classes['@mozilla.org/rdf/container;1'].getService(Components.interfaces.nsIRDFContainer),
	RDFCU  : Components.classes['@mozilla.org/rdf/container-utils;1'].getService(Components.interfaces.nsIRDFContainerUtils),
	DIR    : Components.classes['@mozilla.org/file/directory_service;1'].getService(Components.interfaces.nsIProperties),
	IO     : Components.classes['@mozilla.org/network/io-service;1'].getService(Components.interfaces.nsIIOService),
	UC     : Components.classes['@mozilla.org/intl/scriptableunicodeconverter'].getService(Components.interfaces.nsIScriptableUnicodeConverter),
	WM     : Components.classes['@mozilla.org/appshell/window-mediator;1'].getService(Components.interfaces.nsIWindowMediator),
	PB     : Components.classes['@mozilla.org/preferences;1'].getService(Components.interfaces.nsIPrefBranch),
	PBI    : Components.classes['@mozilla.org/preferences;1'].getService(Components.interfaces.nsIPrefBranchInternal),
};



var SBcommon = {

	getScrapBookDir : function()
	{
		try {
			var isDefault = SBservice.PB.getBoolPref("scrapbook.data.default");
			var myDataDir = SBservice.PB.getComplexValue("scrapbook.data.path", Components.interfaces.nsIPrefLocalizedString).data;
			myDataDir = this.convertPathToFile(myDataDir);
		} catch(ex) {
			isDefault = true; 
		}
		if ( isDefault )
		{
			myDataDir = SBservice.DIR.get("ProfD", Components.interfaces.nsIFile);
			myDataDir.append("ScrapBook");
		}
		if ( !myDataDir.exists() )
		{
			myDataDir.create(myDataDir.DIRECTORY_TYPE, 0700);
		}
		return myDataDir;
	},


	getContentDir : function(aID)
	{
		var myDir = this.getScrapBookDir().clone();
		myDir.append("data");
		if ( !myDir.exists() ) myDir.create(myDir.DIRECTORY_TYPE, 0700);
		myDir.append(aID);
		if ( !myDir.exists() ) myDir.create(myDir.DIRECTORY_TYPE, 0700);
		return myDir;
	},


	removeDirSafety : function(aDir)
	{
		if ( !aDir.leafName.match(/^\d{14}$/) ) return;
		var aFileList = aDir.directoryEntries;
		while ( aFileList.hasMoreElements() )
		{
			var aFile = aFileList.getNext().QueryInterface(Components.interfaces.nsIFile);
			if ( aFile.isFile() ) aFile.remove(false);
		}
		if ( aDir.isDirectory() ) aDir.remove(false);
	},


	loadURL : function(aURL, tabbed)
	{
		var topWindow = SBservice.WM.getMostRecentWindow("navigator:browser");
		var myBrowser = topWindow.document.getElementById("content");
		if ( tabbed ) {
			myBrowser.selectedTab = myBrowser.addTab(aURL);
		} else {
			myBrowser.loadURI(aURL);
		}
	},


	getTimeStamp : function()
	{
		var dd = new Date;
		var y = dd.getFullYear();
		var m = dd.getMonth() + 1; if ( m < 10 ) m = "0" + m;
		var d = dd.getDate();      if ( d < 10 ) d = "0" + d;
		var h = dd.getHours();     if ( h < 10 ) h = "0" + h;
		var i = dd.getMinutes();   if ( i < 10 ) i = "0" + i;
		var s = dd.getSeconds();   if ( s < 10 ) s = "0" + s;
		return y.toString() + m.toString() + d.toString() + h.toString() + i.toString() + s.toString();
	},


	leftZeroPad3 : function(num)
	{
		if ( num < 10 ) {
			return "00" + num;
		} else if ( num < 100 ) {
			return "0" + num;
		} else {
			return num;
		}
	},


	getRootHref : function(aURLString)
	{
		var aURL = Components.classes['@mozilla.org/network/standard-url;1'].createInstance(Components.interfaces.nsIURL);
		aURL.spec = aURLString;
		return aURL.scheme + "://" + aURL.host + "/";
	},


	getBaseHref : function(sURI)
	{
		var pos, Base;
		Base = ( (pos = sURI.indexOf("?")) != -1 ) ? sURI.substring(0, pos) : sURI;
		Base = ( (pos = Base.indexOf("#")) != -1 ) ? Base.substring(0, pos) : Base;
		Base = ( (pos = Base.lastIndexOf("/")) != -1 ) ? Base.substring(0, ++pos) : Base;
		return Base;
	},


	getFileName : function(aURI)
	{
		var pos, Name;
		Name = ( (pos = aURI.indexOf("?")) != -1 ) ? aURI.substring(0, pos) : aURI;
		Name = ( (pos = Name.indexOf("#")) != -1 ) ? Name.substring(0, pos) : Name;
		Name = ( (pos = Name.lastIndexOf("/")) != -1 ) ? Name.substring(++pos) : Name;
		return Name;
	},


	splitFileName : function(aFileName)
	{
		var pos = aFileName.lastIndexOf(".");
		var ret = [];
		if ( pos != -1 ) {
			ret[0] = aFileName.substring(0, pos);
			ret[1] = aFileName.substring(pos + 1, aFileName.length);
		} else {
			ret[0] = aFileName;
			ret[1] = "dat";
		}
		return ret;
	},


	validateFileName : function(aFileName)
	{
		aFileName = aFileName.replace(/[\"]+/g, "'");
		aFileName = aFileName.replace(/[\*\:\?]+/g, "-");
		aFileName = aFileName.replace(/[\<]+/g, "(");
		aFileName = aFileName.replace(/[\>]+/g, ")");
		aFileName = aFileName.replace(/[\\\/\|]+/g, "_");
		aFileName = aFileName.replace(/[\s]+/g, "_");
		aFileName = aFileName.replace(/[%]+/g, "@");
		return aFileName;
	},


	resolveURL : function(aBaseURL, aRelURL)
	{
		var aBaseURLObj = this.convertURLToObject(aBaseURL);
		return aBaseURLObj.resolve(aRelURL);
	},



	readFile : function(aFile)
	{
		try {
			var istream = Components.classes['@mozilla.org/network/file-input-stream;1'].createInstance(Components.interfaces.nsIFileInputStream);
			istream.init(aFile, 1, 0, false);
			var sstream = Components.classes['@mozilla.org/scriptableinputstream;1'].createInstance(Components.interfaces.nsIScriptableInputStream);
			sstream.init(istream);
			var aContent = sstream.read(sstream.available());
			sstream.close();
			istream.close();
			return aContent;
		}
		catch(ex)
		{
			alert("***SCRAPBOOK_ERROR: Failed to read file.\n");
			return false;
		}
	},


	writeFile : function(aFile, aContent, aChars)
	{
		if ( aFile.exists() ) aFile.remove(false);
		aFile.create(aFile.NORMAL_FILE_TYPE, 0666);
		try {
			SBservice.UC.charset = aChars;
			aContent = SBservice.UC.ConvertFromUnicode(aContent);
			var ostream = Components.classes['@mozilla.org/network/file-output-stream;1'].createInstance(Components.interfaces.nsIFileOutputStream);
			ostream.init(aFile, 2, 0x200, false);
			ostream.write(aContent, aContent.length);
			ostream.close();
		}
		catch(ex)
		{
			alert("ScrapBook ERROR: Failed to write file.\n" + ex);
		}
	},


	saveTemplateFile : function(aURISpec, aFile)
	{
		if ( aFile.exists() ) return;
		var myURI = Components.classes['@mozilla.org/network/standard-url;1'].createInstance(Components.interfaces.nsIURL);
		myURI.spec = aURISpec;
		var WBP = Components.classes['@mozilla.org/embedding/browser/nsWebBrowserPersist;1'].createInstance(Components.interfaces.nsIWebBrowserPersist);
		WBP.saveURI(myURI, null, null, null, null, aFile);
	},


	convertStringToUTF8 : function(aString)
	{
		if ( !aString ) return "";
		try {
			SBservice.UC.charset = "UTF-8";
			aString = SBservice.UC.ConvertToUnicode(aString);
		} catch(ex) {
			alert("ScrapBook ERROR: Failure in ConvertToUnicode.");
		}
		return aString;
	},



	convertPathToFile : function(aPath)
	{
		var aFile = Components.classes['@mozilla.org/file/local;1'].createInstance(Components.interfaces.nsILocalFile);
		aFile.initWithPath(aPath);
		return aFile;
	},


	convertFilePathToURL : function(aFilePath)
	{
		var tmpFile = Components.classes['@mozilla.org/file/local;1'].createInstance(Components.interfaces.nsILocalFile);
		tmpFile.initWithPath(aFilePath);
		return SBservice.IO.newFileURI(tmpFile).spec;
	},


	convertURLToObject : function(aURLString)
	{
		var aURL = Components.classes['@mozilla.org/network/standard-url;1'].createInstance(Components.interfaces.nsIURI);
		aURL.spec = aURLString; 
		return aURL;
	},


	convertURLToFile : function(aURLString)
	{
		var aURL = this.convertURLToObject(aURLString);
		if ( !aURL.schemeIs('file') ) return; 
		try {
			var fileHandler = SBservice.IO.getProtocolHandler('file').QueryInterface(Components.interfaces.nsIFileProtocolHandler);
			return fileHandler.getFileFromURLSpec(aURLString); 
		}
		catch(ex)
		{
			alert("ScrapBook ERROR: Failed to convert URL to nsILocalFile.");
		}
	},



	launchDirectory : function(aID)
	{
		var myDir = this.getContentDir(aID);
		if ( nsPreferences.getBoolPref("scrapbook.filer.default", true) )
		{
			try {
				myDir = myDir.QueryInterface(Components.interfaces.nsILocalFile);
				myDir.launch();
			} catch(err) {
				var myDirPath = SBservice.IO.newFileURI(myDir).spec;
				this.loadURL(myDirPath, false);
			}
		}
		else
		{
			this.execProgram(nsPreferences.getLocalizedUnicharPref("scrapbook.filer.path", ""), [myDir.path]);
		}
	},


	execProgram : function(aExecFilePath, args)
	{
		var execfile = Components.classes["@mozilla.org/file/local;1"].createInstance(Components.interfaces.nsILocalFile);
		var process  = Components.classes["@mozilla.org/process/util;1"].createInstance(Components.interfaces.nsIProcess);
		try {
			execfile.initWithPath(aExecFilePath);
			if ( !execfile.exists() )
			{
				alert("ScrapBook ERROR: Following file is not exists.\n" + aExecFilePath);
				return;
			}
			process.init(execfile);
			process.run(false, args, args.length);
		}
		catch (ex)
		{
			alert("ScrapBook ERROR: Following file is not executable.\n" + aExecFilePath);
		}
	},


	getURL : function(aID, aType)
	{
		if ( aType == "note") {
			return "chrome://scrapbook/content/note.xul?id=" + aID;
		} else {
			return SBservice.IO.newFileURI(this.getContentDir(aID)).spec + "index.html";
		}
	},


	getDefaultIcon : function(type)
	{
		switch ( type )
		{
			case "folder" : return "chrome://scrapbook/skin/treefolder.png"; break;
			case "note"   : return "chrome://scrapbook/skin/treenote.png";   break;
			default       : return "chrome://scrapbook/skin/treeitem.png";   break;
		}
	}


};



function SB_switchEditingMode()
{
	var curURL = window._content.location.href;
	if ( curURL.match(/^file/) && curURL.match(/\/data\/(\d{14})\/index\.html$/) )
	{
		SBcommon.loadURL("chrome://scrapbook/content/edit.xul?id=" + RegExp.$1, false);
	}
}



function dumpObj(aObj)
{
	dump("\n\n\n----------------[DUMP_OBJECT]----------------\n\n\n");
	for ( var i in aObj )
	{
		try {
			dump("." + i + " -> " + aObj[i] + "\n");
		} catch(ex) {
			dump("XXXXXXXXXX ERROR XXXXXXXXXX\n" + ex + "\n");
		}
	}
}

