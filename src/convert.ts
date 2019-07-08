import genUUID from "uuid/v4";
import fs from "fs";

type RichText = {
  meta: { version: number };
  contents: Array<{
    text: string;
    attributes?: {
      line?: { header?: number };
      bold?: boolean;
    };
  }>;
};

type DayOneEntry = {
  uuid: string;
  creationDate: string;
  modifiedDate: string;
  text: string;
  location?: {
    administrativeArea?: string;
    country?: string;
    placeName?: string;
  };
};

type DayOneData = {
  metadata: {
    version: number;
  };
  entries: Array<DayOneEntry>;
};

type StandardNotesItem = {
  created_at: string;
  updated_at: string;
  uuid: string;
  content_type: string;
  content: {
    title: string;
    text?: string;
    references: Array<{
      uuid: string;
      content_type: string;
    }>;
  };
};

type StandardNotesData = {
  items: Array<StandardNotesItem>;
};

const formatTag = (title: string, references: string[]) => {
  return {
    uuid: genUUID(),
    content_type: "Tag",
    created_at: "1970-01-01T00:00:00.000Z",
    updated_at: "1970-01-01T00:00:00.000Z",
    content: {
      title: title,
      references: references.map(reference => ({
        uuid: reference,
        content_type: "Note"
      }))
    }
  };
};

const convert = (data: DayOneData): StandardNotesData => {
  const tags: Map<string, Array<string>> = new Map();

  const setOrUpdateTag = (tagName: string, reference: string) => {
    const tag = tags.get(tagName);
    if (tag) {
      tag.push(reference);
    } else {
      tags.set(tagName, [reference]);
    }
  };

  const items = data.entries.reduce((acc: Array<StandardNotesItem>, entry) => {
    if (entry.text == undefined) {
      return acc;
    }

    const entryUUID = genUUID();

    if (entry.location) {
      let locationTags = [];
      // if (entry.location.placeName) {
      //   setOrUpdateTag(entry.location.placeName, entryUUID);
      // }
      if (entry.location.administrativeArea) {
        locationTags.push(entry.location.administrativeArea);
      }
      if (entry.location.country) {
        locationTags.push(entry.location.country);
      }

      setOrUpdateTag(locationTags.join(", "), entryUUID);
    }

    const getContent = () => {
      const lines = entry.text.split("\n");
      const title = lines.shift() || "";

      return {
        title,
        text: lines.join("\n"),
        references: []
      };
    };

    return [
      ...acc,
      {
        created_at: entry.creationDate,
        updated_at: entry.modifiedDate,
        uuid: entryUUID,
        content_type: "Note",
        content: getContent()
      }
    ];
  }, []);

  const tagArray = [];
  for (let [tagName, references] of tags.entries()) {
    if (tagName !== "" && tagName != undefined) {
      tagArray.push(formatTag(tagName, references));
    }
  }

  return { items: items.concat(tagArray) };
};

if (process.argv.length !== 3) {
  console.log(process.argv);
  throw new Error("you must pass exactly 1 argument, the file to convert");
}

fs.writeFile(
  "./out.json",
  JSON.stringify(convert(require(process.argv[2]))),
  function(err) {
    if (err) {
      return console.log(err);
    }

    console.log("The file was saved!");
  }
);
