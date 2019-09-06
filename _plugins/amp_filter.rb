require 'nokogiri'
require 'fastimage'

module Jekyll
  module AmpFilter
    # Filter for HTML 'img' elements.
    # Converts elements to 'amp-img' and adds additional attributes
    # Parameters:
    #   input       - the content of the post
    #   responsive  - boolean, whether to add layout=responsive, true by default
    def amp_images(input, responsive = true, wi = nil, he = nil)
      doc = Nokogiri::HTML.fragment(input)
      amp_images2(doc)
      doc.to_s
    end

    def amp_images2(doc, responsive = true, wi = nil, he = nil)
      # Add width and height to img elements lacking them
      doc.css('img:not([width])').each do |image|
        if wi && he
          image['width']  = wi
          image['height'] = he
        else
          if image['src'].start_with?('http://', 'https://')
            src = image['src']
          else
            # FastImage doesn't seem to handle local paths when used with Jekyll
            # so let's just force the path
            src = File.join(Dir.pwd, image['src'])
          end
          # Jekyll generates static assets after the build process.
          # This causes problems when trying to determine the dimensions of a locally stored image.
          # For now, the only solution is to skip the build and generate the AMP files after the site has beem successfully built.
          # TODO: find a better solution.
          begin
            size = FastImage.size(src)
            image['width']  = size[0]
            image['height'] = size[1]
          rescue Exception => e
            puts 'Unable to get image dimensions for "' + src + '". For local files, build the site with \'--skip-initial-build\' for better results. [Error: ' + e.to_s + ']'
          end
        end
      end
      # Change 'img' elements to 'amp-img', add responsive attribute when needed
      doc.css('img').each do |image|
        image.name = "amp-img"

        image['layout'] = "responsive" if responsive
      end

      # Picture elements are not accepted in amp pages, convert them to amp-img
      #<picture>
      #   <source srcset="mdn-logo-wide.webp" type="image/webp">
      #   <source srcset="mdn-logo-wide.png" media="(min-width: 600px)">
      #   <img src="mdn-logo-narrow.png" alt="MDN">
      #</picture>
      # Move amp-img elements inside picture elements outside of it and remove picture elements
      doc.css('picture').each do |picture|
        # Get img element from picture
        amp_img = picture.css('amp-img')
        picture.add_next_sibling(amp_img) unless amp_img.empty?

        # Remove picture element
        picture.remove
      end

      # Added <img /> tag wrapped with <noscript /> in case js is not enabled
      # but image will still show up. The element would look like this:
      # <amp-img ...>
      #    <noscript>
      #        <img ... />
      #    </noscript>
      # </ampimg ...>
      # Duplicate amp-img, remove layout attribut, wrap it with noscript, and add
      # it as amp-img child
      doc.css('amp-img').each do |amp_img|
        noscript = Nokogiri::XML::Node.new "noscript", doc

        noscript_img = amp_img.dup
        noscript_img.remove_attribute('layout')
        noscript_img.name = 'img'

        noscript.add_child(noscript_img)

        amp_img.add_child(noscript)
      end

      doc
    end

    def amp_scripts(doc)
      doc.search('script').each do |script|
        script.remove
      end

      doc
    end

    def amp_iframes(doc)
      doc.search('iframe').each do |iframe|
        iframe.name = 'amp-iframe'
        iframe.remove_attribute('marginheight')
        iframe.remove_attribute('marginwidth')
        iframe.remove_attribute('allowfullscreen')
        iframe.remove_attribute('allowtransparency')
        iframe.remove_attribute('frameborder')
        iframe['sandbox'] = 'allow-scripts allow-same-origin'
        iframe['src'] = 'https:' + iframe['src'] if iframe['src'].start_with?('//')
        iframe['width'] = 568 unless iframe['width']
        iframe['layout'] = "responsive"
      end

      doc
    end

    def amp(input)
      doc = Nokogiri::HTML.fragment(input)
      
      amp_iframes(doc)
      amp_scripts(doc)
      amp_images2(doc)

      doc.to_s
    end
  end
end

Liquid::Template.register_filter(Jekyll::AmpFilter)
